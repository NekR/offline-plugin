import AppCache from './app-cache';
import ServiceWorker from './service-worker';

import path from 'path';
import deepExtend from 'deep-extend';
import minimatch from 'minimatch';
import { Promise } from 'es6-promise';
import { hasMagic, interpolateString } from './misc/utils';
import loaderUtils from 'loader-utils';

const hasOwn = {}.hasOwnProperty;
const updateStrategies = ['all', 'hash', 'changed'];
const defaultOptions = {
  scope: '', // deprecated

  caches: 'all',
  publicPath: '',
  updateStrategy: 'all',
  externals: [],
  excludes: ['.*', '*.map'],
  relativePaths: true,
  version: null,
  // for entry, default all
  for: null,

  rewrites(asset) {
    return asset.replace(/^([\s\S]*?)index.htm(l?)$/, (match, dir) => {
      return dir || '/';
    });
  },

  alwaysRevalidate: void 0,
  preferOnline: void 0,
  ignoreSearch: ['**'],

  ServiceWorker: {
    output: 'sw.js',
    entry: path.join(__dirname, '../empty-entry.js')
  },

  AppCache: {
    NETWORK: '*',
    FALLBACK: null,
    directory: 'appcache/',
    caches: ['main', 'additional']
  }
};

export default class OfflinePlugin {
  constructor(options) {
    this.options = deepExtend({}, defaultOptions, options);
    this.hash = null;
    this.assets = null;
    this.hashesMap = null;
    this.publicPath = this.options.publicPath;
    this.externals = this.options.externals;
    this.strategy = this.options.updateStrategy;
    this.relativePaths = this.options.relativePaths;
    this.warnings = [];

    if (this.options.scope) {
      this.warnings.push(
        new Error(
          'OfflinePlugin: `scope` option is deprecated, use `publicPath` instead'
        )
      );

      if (this.publicPath) {
        this.warnings.push(
          new Error(
            'OfflinePlugin: `publicPath` is used with deprecated `scope` option, `scope` is ignored'
          )
        );
      } else {
        this.publicPath = this.options.scope;
      }
    }

    if (this.relativePaths && this.publicPath) {
      this.warnings.push(
        new Error(
          'OfflinePlugin: publicPath is used in conjunction with relativePaths,\n' +
          'publicPath was set by the OfflinePlugin to empty string'
        )
      );

      this.publicPath = '';
    }

    if (updateStrategies.indexOf(this.strategy) === -1) {
      throw new Error(`Update strategy must be one of [${ updateStrategies }]`);
    } else if (this.strategy === 'hash') {
      this.warnings.push(
        new Error(
          'OfflinePlugin: `hash` update strategy is deprecated, use `all` strategy and { version: "[hash]" } instead'
        )
      );

      this.strategy = 'all';
      this.options.version = '[hash]';
    }

    if (!Array.isArray(this.externals)) {
      this.externals = [];
    }

    const rewrites = this.options.rewrites || defaultOptions.rewrites;

    if (typeof rewrites === 'function') {
      this.rewrite = (asset) => {
        if (asset.indexOf(this.entryPrefix) === 0) {
          return '';
        }

        return rewrites(asset);
      };
    } else {
      this.rewrite = (asset) => {
        if (asset.indexOf(this.entryPrefix) === 0) {
          return '';
        }

        if (!hasOwn.call(rewrites, asset)) {
          return asset;
        }

        return rewrites[asset];
      };
    }

    this.REST_KEY = ':rest:';
    this.entryPrefix = '__offline_';
    this.tools = {};

    this.addTool(ServiceWorker, 'ServiceWorker');
    this.addTool(AppCache, 'AppCache');

    if (!Object.keys(this.tools).length) {
      throw new Error('You should have at least one cache service to be specified');
    }
  }

  get version() {
    const version = this.options.version;
    const hash = this.hash;

    if (version == null) {
      if (this.strategy === 'all' || !hash) {
        Object.defineProperty(this, 'version', {
          value: (new Date).toLocaleString(),
          writable: false,
          enumerable: true,
          configurable: true,
        });
      } else {
        return hash;
      }
    }

    if (typeof version === 'function') {
      return version(this);
    }

    return interpolateString(version, { hash, version });
  }

  apply(compiler) {
    const runtimePath = path.resolve(__dirname, '../runtime.js');

    compiler.plugin('normal-module-factory', (nmf) => {
      nmf.plugin('after-resolve', (result, callback) => {
        const resource = path.resolve(compiler.context, result.resource);

        if (resource !== runtimePath) {
          return callback(null, result);
        }

        const data = {};

        this.useTools((tool, key) => {
          data[key] = tool.getConfig(this);
        });

        result.loaders.push(
          path.join(__dirname, 'misc/runtime-loader.js') +
            '?' + JSON.stringify(data)
        );

        callback(null, result);
      });
    });

    compiler.plugin('make', (compilation, callback) => {
      if (this.warnings.length) {
        [].push.apply(compilation.warnings, this.warnings);
      }

      this.useTools((tool) => {
        return tool.addEntry(this, compilation, compiler);
      }).then(() => {
        callback();
      }, () => {
        throw new Error('Something went wrong');
      });
    });

    compiler.plugin('emit', (compilation, callback) => {
      const stats = compilation.getStats().toJson();
      // console.log(compilation.getStats());4511

      // compilation.getStats().records.chunks;
      // compilation.getStats().chunks;
      // compilation.getStats().entries;
      // compilation.getStats().preparedChunks;

      // By some reason errors raised here are not fatal,
      // so we need manually try..catch and exit with error
      try {
        // compilation.plugin('chunk-asset') fires when asset is added to chunk
        // and to compilation.assets

        this.hash = compilation.hash;
        this.setAssets(compilation);
        this.setHashesMap(compilation);
      } catch (e) {
        callback(e);
        return;

      }

      // console.log(compilation.assets, compilation.chunks);
      // console.log(compilation.chunks.map((chunk) => chunk.files[0]));
      // var json = compilation.getStats().toJson();
      // delete json.modules;
      // console.log(JSON.stringify(json, null, '  '));

      this.useTools((tool) => {
        return tool.apply(this, compilation, compiler);
      }).then(() => {
        callback();
      }, () => {
        callback(new Error('Something went wrong'));
      });
    });
  }

  setAssets(compilation) {
    const caches = this.options.caches || defaultOptions.caches;
    let assets = Object.keys(compilation.assets);

    if (
      this.strategy !== 'changed' && caches !== 'all' &&
      ((caches.additional && caches.additional.length) || (caches.optional && caches.optional.length))
    ) {
      throw new Error(
        'OfflinePlugin: Cache sections `additional` and `optional` could be used ' +
        'only when `updateStrategy` option is set to `changed`'
      );
    }

    const excludes = this.options.excludes;
    let alwaysRevalidate = this.options.alwaysRevalidate;
    let preferOnline = this.options.preferOnline;
    let ignoreSearch = this.options.ignoreSearch;

    if (Array.isArray(excludes) && excludes.length) {
      assets = assets.filter((asset) => {
        if (excludes.some((glob) => {
          if (minimatch(asset, glob)) {
            return true;
          }
        })) {
          return false;
        }

        return true;
      });
    }

    if (caches === 'all') {
      this.caches = {
        main: this.validatePaths(assets)
      };

      assets = this.caches.main.concat();
    } else {
      let restSection;

      const handledCaches = [
        'main', 'additional', 'optional'
      ].reduce((result, key) => {
        const cache = Array.isArray(caches[key]) ? caches[key] : [];

        if (!cache.length) {
          result[key] = cache;
          return result;
        }

        let cacheResult = [];

        cache.some((cacheKey) => {
          if (cacheKey === this.REST_KEY) {
            if (restSection) {
              throw new Error('The :rest: keyword can be used only once');
            }

            restSection = key;
            return;
          }

          const magic = hasMagic(cacheKey);

          if (magic) {
            let matched;

            for (let i = 0, len = assets.length; i < len; i++) {
              if (!magic.match(assets[i])) continue;

              matched = true;
              cacheResult.push(assets[i]);
              assets.splice(i, 1);
              (i--, len--);
            }

            if (!matched) {
              compilation.warnings.push(
                new Error(`OfflinePlugin: Cache pattern [${ cacheKey }] did not matched any assets`)
              );
            }

            return;
          }

          const index = assets.indexOf(cacheKey);

          externalsCheck: if (index === -1) {
            if (this.externals.some((glob) => {
              if (minimatch(cacheKey, glob)) {
                return true;
              }
            })) {
              break externalsCheck;
            }

            compilation.warnings.push(
              new Error(`OfflinePlugin: Cache asset [${ cacheKey }] is not found in output assets`)
            );
          } else {
            assets.splice(index, 1);
          }

          cacheResult.push(cacheKey);
        });

        result[key] = this.validatePaths(cacheResult);

        return result;
      }, {});

      if (restSection && assets.length) {
        handledCaches[restSection] =
          handledCaches[restSection].concat(this.validatePaths(assets));
      }

      this.caches = handledCaches;

      assets = [].concat(this.caches.main, this.caches.additional, this.caches.optional);
    }

    if (Array.isArray(alwaysRevalidate) && alwaysRevalidate.length) {
      alwaysRevalidate = assets.filter((asset) => {
        if (alwaysRevalidate.some((glob) => {
          if (minimatch(asset, glob)) {
            return true;
          }
        })) {
          return true;
        }

        return false;
      });

      if (alwaysRevalidate.length) {
        this.alwaysRevalidate = alwaysRevalidate;
      }
    }

    if (Array.isArray(ignoreSearch) && ignoreSearch.length) {
      ignoreSearch = assets.filter((asset) => {
        if (ignoreSearch.some((glob) => {
          if (minimatch(asset, glob)) {
            return true;
          }
        })) {
          return true;
        }

        return false;
      });


      if (ignoreSearch.length) {
        this.ignoreSearch = ignoreSearch;
      }
    }

    if (Array.isArray(preferOnline) && preferOnline.length) {
      preferOnline = assets.filter((asset) => {
        if (preferOnline.some((glob) => {
          if (minimatch(asset, glob)) {
            return true;
          }
        })) {
          return true;
        }

        return false;
      });


      if (preferOnline.length) {
        this.preferOnline = preferOnline;
      }
    }

    this.assets = assets;
  }

  setHashesMap(compilation) {
    const hashesMap = this.findAssetsHashes(compilation, {});
    const hashedAssets = Object.keys(hashesMap).map(key => hashesMap[key]);

    Object.keys(compilation.assets).forEach((key) => {
      if (hashedAssets.indexOf(key) !== -1) return;

      const asset = compilation.assets[key];
      // external asset
      if (!asset) return;

      const hash = loaderUtils.getHashDigest(asset.source());
      hashesMap[hash] = key;
    });

    this.hashesMap = {}
    Object.keys(hashesMap).forEach((hash) => {
      let asset = this.validatePaths([hashesMap[hash]])[0];

      if (typeof asset === 'string') {
        this.hashesMap[hash] = asset;
      }
    });
  }

  findAssetsHashes(compilation, map) {
    compilation.chunks.forEach((chunk) => {
      if (chunk.hash && chunk.files.length) {
        map[chunk.hash] = chunk.files[0];
      }
    });

    if (compilation.children.length) {
      compilation.children.forEach((childCompilation) => {
        this.findAssetsHashes(childCompilation, map);
      });
    }

    return map;
  }

  validatePaths(assets) {
    return assets
      .map(this.rewrite)
      .filter(asset => !!asset)
      .map(key => {
        // if absolute url, use it as is
        if (/^(?:\w+:)\/\//.test(key)) {
          return key;
        }

        if (this.relativePaths) {
          return key.replace(/^\//, '');
        }

        return this.publicPath + key.replace(/^\//, '');
      });
  };

  stripEmptyAssets(asset) {
    return !!asset;
  }

  useTools(fn) {
    const tools = Object.keys(this.tools).map((tool) => {
      return fn(this.tools[tool], tool);
    });

    return Promise.all(tools);
  }

  addTool(Tool, name) {
    let options = this.options[name];

    if (options === null || options === false) {
      // tool is not needed
      return;
    }

    this.tools[name] = new Tool(options);
  }
}
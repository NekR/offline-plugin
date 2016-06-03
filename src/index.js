import AppCache from './app-cache';
import ServiceWorker from './service-worker';

import path from 'path';
import deepExtend from 'deep-extend';
import minimatch from 'minimatch';
import { Promise } from 'es6-promise';
import { hasMagic, interpolateString, isAbsoluteURL } from './misc/utils';
import loaderUtils from 'loader-utils';

const hasOwn = {}.hasOwnProperty;
const updateStrategies = ['all', 'hash', 'changed'];
const defaultOptions = {
  scope: '', // deprecated

  caches: 'all',
  publicPath: '',
  updateStrategy: 'all',
  externals: [],
  excludes: ['**/.*', '**/*.map'],
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
    entry: path.join(__dirname, '../empty-entry.js'),
    scope: null,
    events: false
  },

  AppCache: {
    NETWORK: '*',
    FALLBACK: null,
    directory: 'appcache/',
    caches: ['main'],
    events: false
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
      return (new Date).toLocaleString();
    }

    if (typeof version === 'function') {
      return version(this);
    }

    return interpolateString(version, { hash });
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

      // By some reason errors raised here are not fatal,
      // so we need manually try..catch and exit with error
      try {
        this.hash = compilation.hash;
        this.setAssets(compilation);
        this.setHashesMap(compilation);

        // Not used yet
        // this.setNetworkOptions();
      } catch (e) {
        callback(e);
        return;
      }

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
      this.options.safeToUseOptionalCaches !== true &&
      ((caches.additional && caches.additional.length) || (caches.optional && caches.optional.length))
    ) {
      compilation.warnings.push(
        new Error(
          'OfflinePlugin: Cache sections `additional` and `optional` could be used ' +
          'only when each asset passed to it has unique name (e.g. hash or version in it) and ' +
          'is permanently available for given URL. If you think that it\' your case, ' +
          'set `safeToUseOptionalCaches` option to `true`, to remove this warning.'
        )
      );
    }

    const excludes = this.options.excludes;

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
            if (this.externals.length && this.externals.indexOf(cacheKey) !== -1) {
              break externalsCheck;
            }

            compilation.warnings.push(
              new Error(
                `OfflinePlugin: Cache asset [${ cacheKey }] is not found in output assets,` +
                `if it's an external asset, put it to |externals| option to remove this warning`
              )
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

    this.assets = assets;
  }

  setHashesMap(compilation) {
    const hashesMap = this.findAssetsHashes(compilation, {});
    const hashedAssets = Object.keys(hashesMap).reduce((result, hash) => {
      result[hashesMap[hash]] = hash;
      return result;
    }, {});

    this.hashesMap = {}

    Object.keys(compilation.assets).forEach((key) => {
      const validatedPath = this.validatePaths([key])[0];

      if (
        typeof validatedPath !== 'string' ||
        this.assets.indexOf(validatedPath) === -1
      ) return;

      let hash;

      if (hashedAssets[key]) {
        hash = hashedAssets[key];
      } else {
        hash = loaderUtils.getHashDigest(compilation.assets[key].source());
      }

      this.hashesMap[hash] = validatedPath;
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

  setNetworkOptions() {
    let alwaysRevalidate = this.options.alwaysRevalidate;
    let preferOnline = this.options.preferOnline;
    let ignoreSearch = this.options.ignoreSearch;

    const assets = this.assets;

    // Disable temporarily
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
  }

  validatePaths(assets) {
    return assets
      .map(this.rewrite)
      .filter(asset => !!asset)
      .map(key => {
        // if absolute url, use it as is
        if (isAbsoluteURL(key)) {
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
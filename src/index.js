import AppCache from './app-cache';
import ServiceWorker from './service-worker';

import path from 'path';
import deepExtend from 'deep-extend';
import hasMagic from './misc/has-magic';
import minimatch from 'minimatch';
import { Promise } from 'es6-promise';

const hasOwn = {}.hasOwnProperty;
const updateStrategies = ['all', 'hash', 'changed'];
const defaultOptions = {
  caches: 'all',
  publicPath: '',
  scope: '', // deprecated
  updateStrategy: 'all',
  externals: [],
  excludes: [],
  relativePaths: true,
  version: null,

  rewrites(asset) {
    return asset.replace(/^([\s\S]*?)index.htm(l?)$/, (match, dir) => {
      return dir || '/';
    });
  },

  alwaysRevalidate: void 0,
  preferOnline: void 0,
  ignoreSearch: ['*'],

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
      if (this.strategy === 'all' || !this.hash) {
        return (new Date).toLocaleString();
      } else {
        return this.hash;
      }
    }

    return typeof version === 'function' ? version(this) : version + '';
  }

  apply(compiler) {
    const runtimePath = path.resolve(__dirname, '../runtime.js');

    compiler.plugin('normal-module-factory', (nmf) => {
      nmf.plugin('after-resolve', (result, callback) => {
        if (result.resource !== runtimePath) {
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
      this.hash = compilation.getStats().toJson().hash;
      this.setAssets(Object.keys(compilation.assets), compilation);

      this.useTools((tool) => {
        return tool.apply(this, compilation, compiler);
      }).then(() => {
        callback();
      }, () => {
        throw new Error('Something went wrong');
      });
    });
  }

  setAssets(assets, compilation) {
    const caches = this.options.caches || defaultOptions.caches;

    this.assets = assets;

    if (
      this.strategy !== 'changed' && caches !== 'all' &&
      ((caches.additional && caches.additional.length) || (caches.optional && caches.optional.length))
    ) {
      compilation.errors.push(
        new Error('OfflinePlugin: Cache sections `additional` and `optional` could be used ' +
          'only when `updateStrategy` option is set to `changed`')
      );

      this.caches = {};
      return;
    }

    const excludes = this.options.excludes;
    let alwaysRevalidate = this.options.alwaysRevalidate;
    let preferOnline = this.options.preferOnline;
    let ignoreSearch = this.options.ignoreSearch;

    if (Array.isArray(excludes) && excludes.length) {
      assets = assets.filter((asset) => {
        for (let glob of excludes) {
          if (minimatch(asset, glob)) {
            return false;
          }
        }

        return true;
      });
    }

    if (Array.isArray(alwaysRevalidate) && alwaysRevalidate.length) {
      alwaysRevalidate = assets.filter((asset) => {
        for (let glob of alwaysRevalidate) {
          if (minimatch(asset, glob)) {
            return true;
          }
        }

        return false;
      });

      if (alwaysRevalidate.length) {
        this.alwaysRevalidate = alwaysRevalidate;
      }
    }

    if (Array.isArray(ignoreSearch) && ignoreSearch.length) {
      ignoreSearch = assets.filter((asset) => {
        for (let glob of ignoreSearch) {
          if (minimatch(asset, glob)) {
            return true;
          }
        }

        return false;
      });


      if (ignoreSearch.length) {
        this.ignoreSearch = ignoreSearch;
      }
    }

    if (Array.isArray(preferOnline) && preferOnline.length) {
      preferOnline = assets.filter((asset) => {
        for (let glob of preferOnline) {
          if (minimatch(asset, glob)) {
            return true;
          }
        }

        return false;
      });


      if (preferOnline.length) {
        this.preferOnline = preferOnline;
      }
    }

    if (caches === 'all') {
      this.caches = {
        main: this.validatePaths(assets)
      };
    } else {
      let restSection;

      const handledCaches = [
        'main', 'additional', 'optional'
      ].reduce((result, key) => {
        const cache = Array.isArray(caches[key]) ? caches[key] : [];
        let cacheResult = [];

        if (!cache.length) return result;

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
            for (let glob of this.externals) {
              if (minimatch(cacheKey, glob)) {
                break externalsCheck;
              }
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
    }
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
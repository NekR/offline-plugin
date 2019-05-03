import AppCache from './app-cache';
import ServiceWorker from './service-worker';
import defaultOptions,
  {
    AppCacheOptions as defaultAppCacheOptions,
    DEFAULT_AUTO_UPDATE_INTERVAL
  } from './default-options';

import {
  hasMagic, interpolateString,
  isAbsoluteURL, escapeRegexp,
  functionToString
} from './misc/utils';

import path from 'path';
import url from 'url';
import deepExtend from 'deep-extend';
import minimatch from 'minimatch';
import loaderUtils from 'loader-utils';
import slash from 'slash';

const { version: pluginVersion } = require('../package.json');

const hasOwn = {}.hasOwnProperty;
const updateStrategies = ['all', 'hash', 'changed'];

export default class OfflinePlugin {
  constructor(options) {
    const AppCacheOptions = options ? options.AppCache : void 0;

    this.options = deepExtend({}, defaultOptions, options, {
      AppCache: false
    });

    this.hash = null;
    this.assets = null;
    this.hashesMap = null;
    this.externals = null;
    this.publicPath = this.options.publicPath;
    this.strategy = this.options.updateStrategy;
    this.responseStrategy = this.options.responseStrategy;
    this.relativePaths = this.options.relativePaths;
    this.pluginVersion = pluginVersion;
    this.warnings = [];
    this.errors = [];

    this.__tests = this.options.__tests;
    this.flags = {};

    const appCacheEnabled = !!(AppCacheOptions || this.__tests.appCacheEnabled);

    if (appCacheEnabled) {
      this.options.AppCache = deepExtend({}, defaultAppCacheOptions, AppCacheOptions);
    }

    if (this.__tests.pluginVersion) {
      this.pluginVersion = this.__tests.pluginVersion;
    }

    const autoUpdate = this.options.autoUpdate;

    if (autoUpdate === true) {
      this.autoUpdate = DEFAULT_AUTO_UPDATE_INTERVAL;
    } else if (typeof autoUpdate === 'number' && autoUpdate) {
      this.autoUpdate = autoUpdate;
    }

    if (
      this.options.responseStrategy !== "cache-first" &&
      this.options.responseStrategy !== "network-first"
    ) {
      throw new Error(
        'OfflinePlugin: `responseStrategy` option must use ' +
        '`cache-first` or `network-first` (or be undefined).'
      )
    }

    if (typeof this.publicPath !== 'string') {
      this.publicPath = null;
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

    if (!Array.isArray(this.options.externals)) {
      this.options.externals = [];
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

    if (this.options.appShell && typeof this.options.appShell === 'string') {
      this.appShell = this.options.appShell;
    }

    let cacheMaps = this.options.cacheMaps;

    if (this.appShell) {
      // Make appShell the latest in the chain so it could be overridden
      cacheMaps = (cacheMaps || []).concat({
        match: `function(url) {
          if (url.pathname === location.pathname) {
            return;
          }

          return new URL(${JSON.stringify(this.appShell)}, location);
        }`,
        requestTypes: ['navigate']
      });
    }

    this.cacheMaps = this.stringifyCacheMaps(cacheMaps);

    this.REST_KEY = ':rest:';
    this.EXTERNALS_KEY = ':externals:';
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
    const compilerOptions = compiler.options;

    if (this.relativePaths === true) {
      this.publicPath = null;
    }

    if (
      typeof this.publicPath !== 'string' && compilerOptions &&
      compilerOptions.output && compilerOptions.output.publicPath &&
      this.relativePaths !== true
    ) {
      this.publicPath = compilerOptions.output.publicPath;
      this.relativePaths = false;
    }

    if (this.publicPath) {
      this.publicPath = this.publicPath.replace(/\/$/, '') + '/';
    }

    if (this.relativePaths === true && this.publicPath) {
      this.errors.push(
        new Error(
          'OfflinePlugin: `publicPath` is used in conjunction with `relativePaths`,\n' +
          'choose one of it'
        )
      );

      this.relativePaths = false;
    }

    if (this.relativePaths === defaultOptions.relativePaths) {
      this.relativePaths = !this.publicPath;
    }

    this.useTools((tool, key) => {
      this.resolveToolPaths(tool, key, compiler);
    });

    const afterResolveFn = (result, callback) => {
      const resource = path.resolve(compiler.context, result.resource);

      if (resource !== runtimePath) {
        callback(null, result);
        return;
      }

      const data = {
        autoUpdate: this.autoUpdate
      };

      this.useTools((tool, key) => {
        data[key] = tool.getConfig(this);
      });

      result.loaders.push({
        loader: path.join(__dirname, 'misc/runtime-loader.js'),
        options: JSON.stringify(data)
      });

      callback(null, result);
    };

    const makeFn = (compilation, callback) => {
      if (this.warnings.length) {
        [].push.apply(compilation.warnings, this.warnings);
      }

      if (this.errors.length) {
        [].push.apply(compilation.errors, this.errors);
      }

      this.useTools((tool) => {
        return tool.addEntry(this, compilation, compiler);
      }).then(() => {
        callback();
      }).catch((e) => {
        throw (e || new Error('Something went wrong'));
      });
    };

    const emitFn = (compilation, callback) => {
      const runtimeTemplatePath = path.resolve(__dirname, '../tpls/runtime-template.js');
      let hasRuntime = true;

      if (compilation.fileDependencies.indexOf) {
        hasRuntime = compilation.fileDependencies.indexOf(runtimeTemplatePath) !== -1;
      } else if (compilation.fileDependencies.has) {
        hasRuntime = compilation.fileDependencies.has(runtimeTemplatePath);
      }

      if (!hasRuntime && !this.__tests.ignoreRuntime) {
        compilation.errors.push(
          new Error(`OfflinePlugin: Plugin's runtime wasn't added to one of your bundle entries. See this https://goo.gl/YwewYp for details.`)
        );
        callback();
        return;
      }

      const stats = compilation.getStats().toJson();

      // By some reason errors raised here are not fatal,
      // so we need manually try..catch and exit with error
      try {
        this.setAssets(compilation);
        this.setHashesMap(compilation);

        // Generate bundle hash manually (from what we have)
        this.hash = loaderUtils.getHashDigest(
          Object.keys(this.hashesMap).join(''), 'sha1'
        );

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
    };

    if (compiler.hooks) {
      const plugin = { name: 'OfflinePlugin' };

      compiler.hooks.normalModuleFactory.tap(plugin, (nmf) => {
        nmf.hooks.afterResolve.tapAsync(plugin, afterResolveFn);
      });

      compiler.hooks.make.tapAsync(plugin, makeFn);
      compiler.hooks.emit.tapAsync(plugin, emitFn);
    } else {
      compiler.plugin('normal-module-factory', (nmf) => {
        nmf.plugin('after-resolve', afterResolveFn);
      });

      compiler.plugin('make', makeFn);
      compiler.plugin('emit', emitFn);
    }
  }

  setAssets(compilation) {
    const caches = this.options.caches || defaultOptions.caches;

    if (
      this.options.safeToUseOptionalCaches !== true && (
        (caches.additional && caches.additional.length) ||
        (caches.optional && caches.optional.length)
      )
    ) {
      compilation.warnings.push(
        new Error(
          'OfflinePlugin: Cache sections `additional` and `optional` could be used ' +
          'only when each asset passed to it has unique name (e.g. hash or version in it) and ' +
          'is permanently available for given URL. If you think that it\'s your case, ' +
          'set `safeToUseOptionalCaches` option to `true`, to remove this warning.'
        )
      );
    }

    const excludes = this.options.excludes;
    let assets = Object.keys(compilation.assets);
    let externals = this.options.externals.slice();

    if (Array.isArray(excludes) && excludes.length) {
      assets = assets.filter((asset) => !excludes.some((glob) => minimatch(asset, glob)));
    }

    this.externals = this.validatePaths(externals);

    if (caches === 'all') {
      this.assets = this.validatePaths(assets).concat(this.externals);
      this.caches = {
        main: this.assets.concat()
      };
    } else {
      let restSection;
      let externalsSection;

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
              throw new Error(`The ${ this.REST_KEY } keyword can be used only once`);
            }

            restSection = key;
            return;
          }

          if (cacheKey === this.EXTERNALS_KEY) {
            if (externalsSection) {
              throw new Error(`The ${ this.EXTERNALS_KEY } keyword can be used only once`);
            }

            externalsSection = key;
            return;
          }

          let magic;

          if (typeof cacheKey === 'string') {
            magic =
              !isAbsoluteURL(cacheKey) &&
              cacheKey[0] !== '/' &&
              cacheKey.indexOf('./') !== 0 &&
              hasMagic(cacheKey);
          } else if (cacheKey instanceof RegExp) {
            magic = hasMagic(cacheKey);
          } else {
            // Ignore non-string and non-RegExp keys
            return;
          }

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
                new Error(`OfflinePlugin: Cache pattern [${ cacheKey }] did not match any assets`)
              );
            }

            return;
          }

          const index = assets.indexOf(cacheKey);

          __EXTERNALS_CHECK:
          if (index === -1) {
            const externalsIndex = externals.indexOf(cacheKey);

            if (externalsIndex !== -1) {
              externals.splice(externalsIndex, 1);
              break __EXTERNALS_CHECK;
            }

            compilation.warnings.push(
              new Error(
                `OfflinePlugin: Cache asset [${ cacheKey }] is not found in the output assets, ` +
                `if the asset is not processed by webpack, move it to the |externals| option to remove this warning.`
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

      if (externalsSection && externals.length) {
        handledCaches[externalsSection] =
          handledCaches[externalsSection].concat(this.validatePaths(externals));
      }

      this.caches = handledCaches;
      this.assets = [].concat(this.caches.main, this.caches.additional, this.caches.optional);
    }
  }

  setHashesMap(compilation) {
    this.hashesMap = {}

    Object.keys(compilation.assets).forEach((key) => {
      const validatedPath = this.validatePaths([key])[0];

      if (
        typeof validatedPath !== 'string' ||
        this.assets.indexOf(validatedPath) === -1
      ) return;

      let source = compilation.assets[key].source();
      if (source instanceof ArrayBuffer) {
        // This is the case for WebAssembly modules.
        // getHashDigest does not accept ArrayBuffers, so wrap source
        // in something that getHashDigest does accept.
        source = new Uint8Array(source);
      }
      const hash = loaderUtils.getHashDigest(
        source, 'sha1'
      );

      this.hashesMap[hash] = validatedPath;
    });
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

  stringifyCacheMaps(cacheMaps) {
    if (!cacheMaps) {
      return [];
    }

    return cacheMaps.map((map) => {
      if (map.to != null && typeof map.to !== 'string' && typeof map.to !== 'function') {
        throw new Error('cacheMaps `to` property must either string, function, undefined or null');
      }

      if (map.requestTypes != null) {
        if (Array.isArray(map.requestTypes)) {
          const types = map.requestTypes.filter((item) => {
            if (item === 'navigate' || item === 'same-origin' || item === 'cross-origin') {
              return false;
            }

            return true;
          });

          if (types.length) {
            throw new Error("cacheMaps `requestTypes` array values could be only: 'navigate', 'same-origin' or 'cross-origin'");
          }
        } else {
          throw new Error('cacheMaps `requestTypes` property must either array, undefined or null');
        }
      }

      let to;
      let match;

      if (typeof map.to === 'function') {
        to = functionToString(map.to);
      } else {
        to = map.to ? JSON.stringify(map.to) : null;
      }

      if (typeof map.match === 'function') {
        match = functionToString(map.match)
      } else {
        match = map.match + '';
      }

      return {
        match: match,
        to: to,
        requestTypes: map.requestTypes || null
      };
    });
  }

  resolveToolPaths(tool, key, compiler) {
    // Tool much implement:
    //
    // tool.output
    // tool.publicPath
    // tool.basePath
    // tool.location
    // tool.pathRewrite

    if (!this.relativePaths && !this.publicPath) {
      throw new Error('OfflinePlugin: Cannot generate base path for ' + key);
    }

    const isDirectory = tool.output[tool.output.length - 1] === '/';

    if (this.relativePaths) {
      const compilerOutput = (compiler.options.output || { path: process.cwd() }).path;
      const absoluteOutput = path.resolve(compilerOutput, tool.output);

      let relativeBase;

      if (isDirectory) {
        relativeBase = path.relative(absoluteOutput, compilerOutput);
      } else {
        relativeBase = path.relative(path.dirname(absoluteOutput), compilerOutput);
      }

      relativeBase = slash(relativeBase);
      relativeBase = relativeBase.replace(/\/$/, '')

      if (relativeBase) {
        relativeBase = relativeBase + '/';
      }

      tool.basePath = relativeBase[0] === '.' ? relativeBase : './' + relativeBase;
    } else if (this.publicPath) {
      tool.basePath = this.publicPath.replace(/\/$/, '') + '/';
    }

    if (this.relativePaths) {
      tool.location = tool.output;
    } else if (this.publicPath && tool.publicPath) {
      tool.location = tool.publicPath;
    } else if (this.publicPath) {
      const publicUrl = url.parse(this.publicPath);
      const publicPath = publicUrl.pathname;

      publicUrl.pathname = path.join(publicPath, tool.output);
      const outerPathname = path.join('/outer/', publicPath, tool.output);

      if (outerPathname.indexOf('/outer/') !== 0) {
        new Error(`OfflinePlugin: Wrong ${ key }.output value. Final ${ key }.location URL path bounds are outside of publicPath`);
      }

      tool.location = url.format(publicUrl);
    }

    if (this.relativePaths) {
      tool.pathRewrite = (_path => {
        if (isAbsoluteURL(_path) || _path[0] === '/') {
          return _path;
        }

        return tool.basePath + _path;
      });
    } else {
      tool.pathRewrite = (path => {
        return path;
      });
    }
  }

  validatePaths(assets) {
    return assets
      .map(this.rewrite)
      .filter(asset => !!asset)
      .map(key => {
        // If absolute url, use it as is
        if (isAbsoluteURL(key)) {
          return key;
        }

        if (this.relativePaths) {
          return key.replace(/^\.\//, '');
        }

        // Absolute path, use it as is
        if (key[0] === '/') {
          return key;
        }

        return this.publicPath + key.replace(/^\.?\//, '');
      });
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

OfflinePlugin.defaultOptions = defaultOptions;

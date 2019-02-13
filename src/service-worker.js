import SingleEntryPlugin from 'webpack/lib/SingleEntryPlugin';
import { makeMinificationPlugin, isMinificationPlugin } from './misc/get-minification-plugin';
import path from 'path';
import deepExtend from 'deep-extend';
import {
  getSource, pathToBase, isAbsoluteURL,
  isAbsolutePath, functionToString
} from './misc/utils';

export default class ServiceWorker {
  constructor(options) {
    if (isAbsolutePath(options.output)) {
      throw new Error(
        'OfflinePlugin: ServiceWorker.output option must be a relative path, ' +
        'but an absolute path was passed'
      );
    }

    this.minify = options.minify;
    this.output = options.output.replace(/^\.\/+/, '');
    this.publicPath = options.publicPath;

    this.basePath = null;
    this.location = null;
    this.pathRewrite = null;

    // Tool specific properties
    this.entry = options.entry;
    this.scope = options.scope ? options.scope + '' : void 0;
    this.events = !!options.events;
    this.prefetchRequest = this.validatePrefetch(options.prefetchRequest);
    this.updateViaCache = (options.updateViaCache || '') + '';
    this.navigationPreload = options.navigationPreload;
    this.forceInstall = !!options.forceInstall;

    let cacheNameQualifier = '';

    if (options.cacheName) {
      cacheNameQualifier = ':' + options.cacheName;
    }

    this.ENTRY_NAME = 'serviceworker';
    this.CACHE_NAME = 'webpack-offline' + cacheNameQualifier;
    this.SW_DATA_VAR = '__wpo';
  }

  addEntry(plugin, compilation, compiler) {
    if (!this.entry) return Promise.resolve();

    const name = plugin.entryPrefix + this.ENTRY_NAME;
    const childCompiler = compilation.createChildCompiler(name, {
      // filename: this.output
      filename: name
    });

    const data = JSON.stringify({
      data_var_name: this.SW_DATA_VAR,
      cacheMaps: plugin.cacheMaps,
      navigationPreload: this.stringifyNavigationPreload(this.navigationPreload, plugin)
    });

    const swLoaderPath = path.join(__dirname, 'misc/sw-loader.js');
    const loader = '!!' + swLoaderPath + '?json=' + escape(data);
    const entry = loader + '!' + this.entry;

    childCompiler.context = compiler.context;
    new SingleEntryPlugin(compiler.context, entry, name).apply(childCompiler);

    const optimization = compiler.options.optimization || {};

    const uglifyOptions = {
      compress: {
        warnings: false,
        dead_code: true,
        drop_console: true,
        unused: true
      },

      output: {
        comments: false
      }
    };

    if (this.minify === true) {
      if (makeMinificationPlugin == null) {
        throw new Error('OfflinePlugin: uglifyjs-webpack-plugin or terser-webpack-plugin is required to preform a minification')
      }

      const options = {
        test: new RegExp(name),
        uglifyOptions,
      };

      makeMinificationPlugin(options).apply(childCompiler);
    } else if (
      (this.minify !== false || optimization.minimize) && makeMinificationPlugin
    ) {
      // Do not perform auto-minification if MinificationPlugin isn't installed

      const added = ((optimization.minimize && optimization.minimizer) || [])
      .concat(compiler.options.plugins || []).some((plugin) => {
        if (isMinificationPlugin(plugin)) {
          const options = deepExtend({}, plugin.options);

          options.test = new RegExp(name);
          makeMinificationPlugin(options).apply(childCompiler);

          return true;
        }
      });

      if (!added && optimization.minimize) {
        const options = {
          test: new RegExp(name),
          uglifyOptions,
        };

        makeMinificationPlugin(options).apply(childCompiler);
      }
    }

    // Needed for HMR. offline-plugin doesn't support it,
    // but added just in case to prevent other errors
    const compilationFn = (compilation) => {
      if (compilation.cache) {
        if (!compilation.cache[name]) {
          compilation.cache[name] = {};
        }

        compilation.cache = compilation.cache[name];
      }
    };

    if (childCompiler.hooks) {
      const plugin = { name: 'OfflinePlugin' };
      childCompiler.hooks.compilation.tap(plugin, compilationFn);
    } else {
      childCompiler.plugin('compilation', compilationFn);
    }

    return new Promise((resolve, reject) => {
      childCompiler.runAsChild((err, entries, childCompilation) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  apply(plugin, compilation, compiler) {
    let minify;

    if (typeof this.minify === 'boolean') {
      minify = this.minify;
    } else {
      minify = makeMinificationPlugin && (
        !!(
          compiler.options.optimization &&
          compiler.options.optimization.minimize
        ) || !!(
          (compiler.options.plugins || []).some(isMinificationPlugin)
        )
      );
    }

    let source = this.getDataTemplate(plugin.caches, plugin, minify);

    if (this.entry) {
      const name = plugin.entryPrefix + this.ENTRY_NAME;
      const asset = compilation.assets[name];

      if (!asset) {
        compilation.errors.push(
          new Error('OfflinePlugin: ServiceWorker entry is not found in output assets')
        );

        return;
      }

      delete compilation.assets[name];

      if (!plugin.__tests.swMetadataOnly) {
        source += '\n\n' + asset.source();
      }
    }

    compilation.assets[this.output] = getSource(source);
  }

  getDataTemplate(data, plugin, minify) {
    const rewriteFunction = this.pathRewrite;

    const cache = (key) => {
      return (data[key] || []).map(rewriteFunction);
    };

    const hashesMap = Object.keys(plugin.hashesMap)
      .reduce((result, hash) => {
        const asset = plugin.hashesMap[hash];

        result[hash] = rewriteFunction(asset);
        return result;
      }, {});

    const externals = plugin.externals.map(rewriteFunction);

    let pluginVersion;

    if (plugin.pluginVersion && !plugin.__tests.noVersionDump) {
      pluginVersion = plugin.pluginVersion;
    }

    return `
      var ${ this.SW_DATA_VAR } = ${ JSON.stringify({
        assets: {
          main: cache('main'),
          additional: cache('additional'),
          optional: cache('optional')
        },

        externals: externals,

        hashesMap: hashesMap,

        strategy: plugin.strategy,
        responseStrategy: plugin.responseStrategy,
        version: plugin.version,
        name: this.CACHE_NAME,
        pluginVersion: pluginVersion,
        relativePaths: plugin.relativePaths,

        prefetchRequest: this.prefetchRequest,

        // These aren't added
        alwaysRevalidate: plugin.alwaysRevalidate,
        preferOnline: plugin.preferOnline,
        ignoreSearch: plugin.ignoreSearch,
      }, null, minify ? void 0 : '  ') };
    `.trim();
  }

  getConfig(plugin) {
    return {
      location: this.location,
      scope: this.scope,
      updateViaCache: this.updateViaCache,
      events: this.events,
      force: this.forceInstall
    };
  }

  validatePrefetch(request) {
    if (!request) {
      return void 0;
    }

    if (
      request.credentials === 'same-origin' &&
      request.headers === void 0 &&
      request.mode === 'cors' &&
      request.cache === void 0
    ) {
      return void 0;
    }

    return {
      credentials: request.credentials,
      headers: request.headers,
      mode: request.mode,
      cache: request.cache
    };
  }

  stringifyNavigationPreload(navigationPreload, plugin) {
    let result;

    if (typeof navigationPreload === 'object') {
      result = navigationPreload = `{
        map: ${functionToString(navigationPreload.map)},
        test: ${functionToString(navigationPreload.test)}
      }`;
    } else {
      if (typeof navigationPreload !== 'boolean') {
        if (plugin.responseStrategy === 'network-first') {
          navigationPreload = true;
        } else {
          navigationPreload = false;
        }
      }

      result = JSON.stringify(navigationPreload);
    }

    return result;
  }
}

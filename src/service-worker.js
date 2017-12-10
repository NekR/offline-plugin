import SingleEntryPlugin from 'webpack/lib/SingleEntryPlugin';
import path from 'path';
import webpack from 'webpack';
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
    this.navigateFallbackURL = options.navigateFallbackURL;
    this.navigateFallbackForRedirects = options.navigateFallbackForRedirects;
    this.prefetchRequest = this.validatePrefetch(options.prefetchRequest);
    this.navigationPreload = options.navigationPreload;

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
      loaders: Object.keys(plugin.loaders),
      cacheMaps: plugin.cacheMaps,
      navigationPreload: this.stringifyNavigationPreload(this.navigationPreload, plugin)
    });

    const swLoaderPath = path.join(__dirname, 'misc/sw-loader.js');
    const loader = '!!' + swLoaderPath + '?json=' + escape(data);
    const entry = loader + '!' + this.entry;

    childCompiler.context = compiler.context;
    childCompiler.apply(new SingleEntryPlugin(compiler.context, entry, name));

    if (this.minify === true) {
      const options = {
        test: new RegExp(name),
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

      childCompiler.apply(new webpack.optimize.UglifyJsPlugin(options));
    } else if (this.minify !== false) {
      (compiler.options.plugins || []).some((plugin) => {
        if (plugin instanceof webpack.optimize.UglifyJsPlugin) {
          const options = deepExtend({}, plugin.options);

          options.test = new RegExp(name);
          childCompiler.apply(new webpack.optimize.UglifyJsPlugin(options));

          return true;
        }
      });
    }

    // Needed for HMR. offline-plugin doesn't support it,
    // but added just in case to prevent other errors
    childCompiler.plugin('compilation', function (compilation) {
      if (compilation.cache) {
        if (!compilation.cache[name]) {
          compilation.cache[name] = {};
        }

        compilation.cache = compilation.cache[name];
      }
    });

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
      minify = !!(compiler.options.plugins || []).some((plugin) => {
        return plugin instanceof webpack.optimize.UglifyJsPlugin;
      });
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

    const loaders = Object.keys(plugin.loaders).length ?
      plugin.loaders : void 0;

    return `
      var ${ this.SW_DATA_VAR } = ${ JSON.stringify({
        assets: {
          main: cache('main'),
          additional: cache('additional'),
          optional: cache('optional')
        },

        externals: externals,

        hashesMap: hashesMap,
        navigateFallbackURL: this.navigateFallbackURL,
        navigateFallbackForRedirects: this.navigateFallbackURL ?
          this.navigateFallbackForRedirects : void 0,

        strategy: plugin.strategy,
        responseStrategy: plugin.responseStrategy,
        version: plugin.version,
        name: this.CACHE_NAME,
        pluginVersion: pluginVersion,
        relativePaths: plugin.relativePaths,

        prefetchRequest: this.prefetchRequest,
        loaders: loaders,

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
      events: this.events
    };
  }

  validatePrefetch(request) {
    if (!request) {
      return void 0;
    }

    if (
      request.credentials === 'omit' &&
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

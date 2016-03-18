import SingleEntryPlugin from 'webpack/lib/SingleEntryPlugin';
import path from 'path';
import webpack from 'webpack';
import deepExtend from 'deep-extend';
import { Promise } from 'es6-promise';

import getSource from './misc/get-source';
import pathToBase from './misc/path-to-base';

export default class ServiceWorker {
  constructor(options) {
    this.entry = options.entry;
    this.output = options.output.replace(/^\//, '');
    this.basePath = pathToBase(this.output, true);

    this.ENTRY_NAME = 'serviceworker';
    this.CACHE_NAME = 'webpack-offline';
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
      data_var_name: this.SW_DATA_VAR
    });
    const loader = '!!' + path.join(__dirname, 'misc/sw-loader.js') + '?' + data;
    const entry = loader + '!' + this.entry;

    childCompiler.context = compiler.context;
    childCompiler.apply(new SingleEntryPlugin(compiler.context, entry, name));

    (compiler.options.plugins || []).some((plugin) => {
      if (plugin instanceof webpack.optimize.UglifyJsPlugin) {
        const options = deepExtend({}, plugin.options);

        options.test = new RegExp(name);
        childCompiler.apply(new webpack.optimize.UglifyJsPlugin(options));

        return true;
      }
    });

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
    const minify = (compiler.options.plugins || []).some((plugin) => {
      return plugin instanceof webpack.optimize.UglifyJsPlugin;
    });

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
      source += '\n\n' + asset.source();
    }

    compilation.assets[this.output] = getSource(source);
  }

  getDataTemplate(data, plugin, minify) {
    const cache = (key) => {
      return (data[key] || []).map(
        plugin.relativePaths ? (path => this.basePath + path) : (a => a)
      );
    };

    return `
      var ${ this.SW_DATA_VAR } = ${ JSON.stringify({
        assets: {
          main: cache('main'),
          additional: cache('additional'),
          optional: cache('optional')
        },
        strategy: plugin.strategy,
        version: plugin.strategy !== 'hash' ? plugin.version : void 0,
        hash: plugin.strategy === 'hash' ? plugin.hash : void 0,
        name: this.CACHE_NAME,
        relativePaths: plugin.relativePaths,
        alwaysRevalidate: plugin.alwaysRevalidate,
        preferOnline: plugin.preferOnline,
        ignoreSearch: plugin.ignoreSearch,
      }, null, minify ? void 0 : '  ') };
    `.trim();
  };

  getConfig(plugin) {
    return {
      output: plugin.publicPath + this.output
    };
  }
}
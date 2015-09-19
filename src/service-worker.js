import SingleEntryDependency from 'webpack/lib/dependencies/SingleEntryDependency';
import path from 'path';
import webpack from 'webpack';

import getSource from './misc/get-source';

export default class ServiceWorker {
  constructor(options) {
    this.output = options.output;
    this.entry = options.entry;

    this.ENTRY_NAME = 'serviceworker';
    this.CACHE_NAME = 'webpack-offline';
    this.SW_DATA_VAR = '__wpo';
  }

  addEntry(plugin, compilation, compiler) {
    if (!this.entry) return Promise.resolve();

    const data = JSON.stringify({
      data_var_name: this.SW_DATA_VAR
    });
    const loader = '!!' + path.join(__dirname, 'misc/sw-loader.js') + '?' + data;
    const name = plugin.entryPrefix + this.ENTRY_NAME;
    const dep = new SingleEntryDependency(loader + '!' + this.entry);
    dep.loc = name;

    return new Promise((resolve) => {
      compilation.addEntry(compiler.context, dep, name, () => {
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
      let name = plugin.entryPrefix + this.ENTRY_NAME;
      let entry = compilation.assets[name]

      if (!entry) {
        name = name + '.js';
        entry = compilation.assets[name]
      }

      if (!entry) {
        throw new Error('Something went wrong with ServiceWorker entry');
      }

      entry = entry.source();
      delete compilation.assets[name];

      source += '\n\n' + entry;
    }

    compilation.assets[this.output] = getSource(source);
  }

  getDataTemplate(data, plugin, minify) {
    const cache = (key) => {
      return (data[key] || []);
    };

    return `
      var ${ this.SW_DATA_VAR } = ${ JSON.stringify({
        assets: {
          main: cache('main'),
          additional: cache('additional'),
          optional: cache('optional'),
        },
        strategy: plugin.strategy,
        version: plugin.strategy === 'all' ? plugin.version : void 0,
        hash: plugin.strategy === 'hash' ? plugin.hash : void 0,
        name: this.CACHE_NAME
      }, null, minify ? void 0 : '  ') };
    `.trim();
  };

  getConfig(plugin) {
    return {
      output: plugin.scope + this.output
    };
  }
}
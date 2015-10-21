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
      const name = plugin.entryPrefix + this.ENTRY_NAME;
      const entry = compilation.namedChunks[name];

      if (!entry) {
        compilation.errors.push(
          new Error('OfflinePlugin: ServiceWorker entry is not found in output chunks')
        );

        return;
      }

      if (entry.files.length > 1) {
        compilation.warnings.push(
          new Error('OfflinePlugin: ServiceWorker entry has more than one output file, only first will be used')
        );
      }

      let entryAsset = entry.files[0];

      entryAsset = compilation.assets[entryAsset];
      entryAsset = entryAsset.source();

      entry.files.forEach((file) => {
        delete compilation.assets[file];
      });

      entry.files = [this.output];
      source += '\n\n' + entryAsset;
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
        hash: plugin.strategy !== 'all' ? plugin.hash : void 0,
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
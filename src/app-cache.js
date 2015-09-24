import getSource from './misc/get-source';

export default class AppCache {
  constructor(options) {
    this.NETWORK = options.NETWORK;
    this.directory = options.directory.replace(/\/$/, '/');
    this.name = 'manifest';
    this.caches = options.caches;
  }

  addEntry(plugin, compilation, compiler) {
    // no-op
    return Promise.resolve();
  }

  apply(plugin, compilation, compiler) {
    if (!Array.isArray(this.caches)) {
      throw new Error('AppCache caches must be an array');
    }

    const cache = this.caches.reduce((result, name) => {
      const cache = plugin.caches[name];
      if (!cache || !cache.length) return result;

      if (result) {
        result = result.concat(cache);
      } else {
        result = cache;
      }

      return result;
    }, null) || [];

    const path = this.directory + this.name;
    const manifest = this.getManifestTemplate(cache, plugin);
    const page = this.getPageTemplate(this.name);

    compilation.assets[path + '.appcache'] = getSource(manifest);
    compilation.assets[path + '.html'] = getSource(page);
  }

  getManifestTemplate(cache, plugin) {
    let tag;

    if (plugin.strategy === 'all') {
      tag = 'ver:' + plugin.version;
    }

    if (plugin.strategy === 'changed') {
      tag = 'hash:' + plugin.hash;
    }

    if (plugin.strategy === 'hash') {
      tag = 'hash:' + plugin.hash;
    }

    return `
      CACHE MANIFEST
      #${ tag }

      CACHE:
      ${ cache.join('\n') }

      NETWORK:
      ${ this.NETWORK + '' }
    `.trim().replace(/^      */gm, '');
  }

  getPageTemplate(name, content) {
    return `
      <!doctype html>
      <html manifest="${ name }.appcache">${ content || '' }</html>
    `.trim().replace(/^      */gm, '');
  }

  getConfig(plugin) {
    return {
      directory: plugin.scope + this.directory,
      name: this.name
    };
  }
}
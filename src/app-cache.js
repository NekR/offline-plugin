import getSource from './misc/get-source';

export default class AppCache {
  constructor(options) {
    this.NETWORK = options.NETWORK;
    this.directory = options.directory.replace(/\/$/, '/');
    this.name = 'manifest';
  }

  addEntry(plugin, compilation, compiler) {
    // no-op
    return Promise.resolve();
  }

  apply(plugin, compilation, compiler) {
    let cache = plugin.caches.main;

    if (!cache) {
      cache = plugin.caches.additional || [];
    } else if (plugin.caches.additional) {
      cache = cache.concat(plugin.caches.additional);
    }

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
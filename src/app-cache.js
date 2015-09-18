import getSource from '../misc/get-source';

export default class AppCache {
  constructor(options) {
    this.NETWORK = options.NETWORK;
    this.directory = options.directory.replace(/\/$/, '/');
  }

  addEntry(plugin, compilation, compiler) {
    // no-op
    return Promise.resolve();
  }

  apply(plugin, compilation, compiler) {
    ['main', 'additional'].forEach((name) => {
      const cache = plugin.caches[name];
      if (!Array.isArray(cache) || !cache.length) return;

      const hasAdditional = name === 'main' && this.hasAdditionalCache(plugin);
      const path = this.directory + name;
      const manifest = this.getManifestTemplate(cache, plugin);
      const page = this.getPageTemplate(
        name,
        hasAdditional ? this.getAdditionalLoad(plugin) : ''
      );

      compilation.assets[path + '.appcache'] = getSource(manifest);
      compilation.assets[path + '.html'] = getSource(page);
    });
  }

  hasAdditionalCache(plugin) {
    const caches = plugin.options.caches;

    if (
      caches !== 'all' && (
        (caches.additional && caches.additional.length) ||
        (!caches.additional && (
          (caches.main && caches.main.indexOf(plugin.REST_KEY) === -1) ||
          !caches.main
        ))
      )
    ) return true;
  }

  getManifestTemplate(cache, plugin) {
    let tag;

    if (plugin.strategy === 'all') {
      tag = 'ver:' + plugin.version;
    }

    if (plugin.strategy === 'changed') {
      tag = ':static';
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
    `;
  }

  getAdditionalLoad(plugin) {
    var directory = this.getConfig(plugin).directory;

    return `
      <script>
        (function() {
          var called = false;

          [
            'cached',
            'noupdate',
            'obsolete',
            'updateready',
            // 'error',
          ].forEach(function(event) {
            applicationCache.addEventListener(event, function() {
              if (called) return;
              called = true;

              var directory = ${ JSON.stringify(directory) };

              setTimeout(function() {
                var page = directory + 'additional.html';
                var iframe = document.createElement('iframe');

                iframe.src = page;
                iframe.style.display = 'none';

                document.body.appendChild(iframe);
              });
            }, false);
          });
        }());
      </script>
    `;
  }

  getConfig(plugin) {
    return {
      directory: plugin.scope + this.directory
    };
  }
}
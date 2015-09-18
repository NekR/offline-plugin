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

      const manifest = this.getManifestTemplate(cache, plugin);
      const page = this.getPageTemplate(name, plugin);

      const path = this.directory + name;

      compilation.assets[path + '.appcache'] = getSource(manifest);
      compilation.assets[path + '.html'] = getSource(page);
    });
  }

  getManifestTemplate(cache, plugin) {
    return `
      CACHE MANIFEST
      #ver. ${ plugin.version }

      CACHE:
      ${ cache.join('\n') }

      NETWORK:
      ${ this.NETWORK + '' }
    `.trim().replace(/^      */gm, '');
  }

  getPageTemplate(name) {
    return `
      <!doctype html>
      <html manifest="${ name }.appcache">
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

                
              }, false);
            });
          }());
        </script>
      </html>
    `;
  }

  getConfig(plugin) {
    return {
      directory: plugin.scope + this.directory
    };
  }
}
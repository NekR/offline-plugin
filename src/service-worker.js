import SingleEntryDependency from 'webpack/lib/dependencies/SingleEntryDependency';
import fs from 'fs';
import path from 'path';

const cachePolyfill = fs.readFileSync(
  path.join(__dirname, '../misc/cache-polyfill.js')
);

export default class ServiceWorker {
  constructor(options) {
    this.output = options.output;
    this.entry = options.entry;
    this.entryName = 'serviceworker';
    this.scope = options.scope;
  }

  addEntry(plugin, compilation, compiler) {
    if (!this.entry) return Promise.resolve();

    const name = plugin.entryPrefix + this.entryName;
    const dep = new SingleEntryDependency(this.entry);
    dep.loc = name;

    return new Promise((resolve) => {
      compilation.addEntry(compiler.context, dep, name, () => {
        resolve();
      });
    });
  }

  apply(plugin, compilation, compiler) {
    let source = this.getTemplate(plugin.caches);

    if (this.entry) {
      let name = plugin.entryPrefix + this.entryName;
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

    compilation.assets[this.output] = {
      source() {
        return source;
      },
      size() {
        return Buffer.byteLength(source, 'utf8');
      }
    };
  }

  getTemplate(data) {
    var cache = (key) => {
      return (data[key] || [])
        .map((asset) => JSON.stringify(asset)).join(',\n');
    };

    return `
      polyfill();

      var CACHE_NAME = 'webpack-offline';
      var CACHE_VERSION = ${ 0 };

      var mainCache = [
        ${ cache('main') }
      ];

      var additionalCache = [
        ${ cache('additional') }
      ];

      var optionalCache = [
        ${ cache('optional') }
      ];

      self.addEventListener('install', function(event) {
        event.waitUntil(
          caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(mainCache);
          })
        );
      });

      self.addEventListener('activate', function(event) {
        var cache;
        var update = caches.open(CACHE_NAME).then(function(c) {
          cache = c;
          return cache.keys()
        }).then(function(keys) {
          return Promise.all(keys.map(function(request) {
            var url = new URL(request.url);
            if (mainCache.indexOf(url.pathname) !== -1) return;

            console.log('delete:', url.href);
            return cache.delete(request);
          }))
        }).then(function() {
          return cache.addAll(additionalCache);
        });

        event.waitUntil(update);
      });

      self.addEventListener('fetch', function(event) {
        var url = new URL(event.request.url);

        if (
          url.origin !== location.origin ||
          optionalCache.indexOf(url.pathname) === -1
        ) {
          event.respondWith(
            caches.match(event.request).then(function(response) {
              return response || fetch(event.request);
            })
          );

          return;
        }

        var resource = caches.match(event.request).then(function(response) {
          if (response) {
            return response;
          }

          return fetch(event.request.clone()).then(function(response) {
            if (
              !response || response.status !== 200 ||
              response.type !== 'basic'
            ) {
              return response;
            }

            var responseClone = response.clone();

            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });

            return response;
          });
        })

        event.respondWith(resource);
      });

      function polyfill() {
        ${ cachePolyfill }
      }
    `.trim().replace(/^      /gm, '');;
  }

  getConfig(plugin) {
    return {
      output: plugin.options.scope + this.output
    };
  }
}
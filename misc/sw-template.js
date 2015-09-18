WebpackServiceWorker(%data_var_name%);

function WebpackServiceWorker(params) {
  var assets = params.assets;

  var CACHE_NAME = params.name;
  var CACHE_VERSION = params.version;
  var CACHE_KEY = CACHE_NAME + ':' + CACHE_VERSION;

  var allAssets = [].concat(assets.main, assets.additional, assets.optional);

  self.addEventListener('install', function(event) {
    console.log('[SW]:', 'Install event');

    event.waitUntil(
      caches.open(CACHE_KEY).then(function(cache) {
        return cache.addAll(assets.main);
      }).then(function() {
        console.groupCollapsed('[SW]:', 'Cached assets: main');
        assets.main.forEach(function(asset) {
          console.log('Asset:', asset);
        });
        console.groupEnd();
      })
    );
  });

  self.addEventListener('activate', function(event) {
    console.log('[SW]:', 'Activate event');

    var caching;

    if (assets.additional.length) {
      caching = caches.open(CACHE_KEY).then(function(cache) {
        return cache.addAll(assets.additional).then(function() {
          console.groupCollapsed('[SW]:', 'Cached assets: additional');
          assets.additional.forEach(function(asset) {
            console.log('Asset:', asset);
          });
          console.groupEnd();
        });
      });
    } else {
      caching = Promise.resolve();
    }

    var deletion = caches.keys().then(function(names) {
      return Promise.all(names.map(function(name) {
        if (name === CACHE_KEY || name.indexOf(CACHE_NAME) !== 0) return;
        console.log('[SW]:', 'Delete cache:', name);
        return caches.delete(name);
      }));
    });

    event.waitUntil(Promise.all([caching, deletion]));
  });

  self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    if (
      url.origin !== location.origin ||
      allAssets.indexOf(url.pathname) === -1
    ) {
      if (DEBUG) {
        console.log('Path [' + url.pathname + '] does not match any assets');
      }

      return event.respondWith(
        fetch(event.request)
      );
    }

    var resource = caches.match(event.request).then(function(response) {
      if (response) {
        if (DEBUG) {
          console.log('Path [' + url.pathname + '] from cache');
        }

        return response;
      }

      return fetch(event.request.clone()).then(function(response) {
        if (
          !response || response.status !== 200 || response.type !== 'basic'
        ) {
          if (DEBUG) {
            console.log('Path [' + url.pathname + '] wrong response');
          }

          return response;
        }

        if (DEBUG) {
          console.log('Path [' + url.pathname + '] fetched');
        }

        var responseClone = response.clone();

        caches.open(CACHE_KEY).then(function(cache) {
          return cache.put(event.request, responseClone);
        }).then(function() {
          if (DEBUG) {
            console.log('Path [' + url.pathname + '] cached');
          }
        });

        return response;
      });
    })

    event.respondWith(resource);
  });
}
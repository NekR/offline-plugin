'use strict';

function WebpackServiceWorker(params) {
  var strategy = params.strategy;
  var assets = params.assets;
  var tagMap = {
    all: params.version,
    // Hash is included in output file, but not used in cache name,
    // this allows updating only changed files in `additional` section and
    // always revalidation of `main` section when hash changed
    changed: 'static',
    hash: params.hash
  };

  var CACHE_PREFIX = params.name;
  var CACHE_TAG = tagMap[strategy];
  var CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;

  var allAssets = [].concat(assets.main, assets.additional, assets.optional);

  self.addEventListener('install', function (event) {
    console.log('[SW]:', 'Install event');

    event.waitUntil(cacheAssets('main'));
  });

  self.addEventListener('activate', function (event) {
    console.log('[SW]:', 'Activate event');

    var caching = undefined;
    // Delete all assets which start with CACHE_PREFIX and
    // is not current cache (CACHE_NAME)
    var deletion = deleteObsolete();

    if (assets.additional.length) {
      caching = strategy === 'changed' ?
      // Update current (static) cache, remove all files
      // (old hash/version in file names) and add new files
      updateChanged() :
      // or load additional section to current
      // (dynamic via hash/version) cache
      cacheAssets('additional');
    } else {
      caching = Promise.resolve();
    }

    event.waitUntil(Promise.all([caching, deletion]).then(function () {
      // Skip waiting other clients only when all mandatory cache is loaded
      // (allows new clients to use this worker immediately)
      if (self.skipWaiting) self.skipWaiting();
    }));
  });

  function cacheAssets(section) {
    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(assets[section]).then(function () {
        console.groupCollapsed('[SW]:', 'Cached assets: ' + section);
        assets[section].forEach(function (asset) {
          console.log('Asset:', asset);
        });
        console.groupEnd();
      });
    });
  }

  function deleteObsolete() {
    return caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name === CACHE_NAME || name.indexOf(CACHE_PREFIX) !== 0) return;
        console.log('[SW]:', 'Delete cache:', name);
        return caches['delete'](name);
      }));
    });
  }

  function updateChanged() {
    var cache = undefined;

    return caches.open(CACHE_NAME).then(function (_cache) {
      cache = _cache;
      return _cache.keys();
    }).then(function (keys) {
      var diff = assets.additional.concat();
      var deletion = keys.map(function (req) {
        var url = new URL(req.url);

        if (allAssets.indexOf(url.pathname) === -1) {
          return cache['delete'](req);
        }

        var index = diff.indexOf(url.pathname);

        if (index !== -1) {
          diff.splice(index, 1);
        }
      });

      var caching = diff.map(function (path) {
        return new Request(path);
      }).map(function (req) {
        return fetch(req).then(function (res) {
          return cache.put(req, res);
        }, function () {});
      });

      return Promise.all([Promise.all(deletion), Promise.all(caching)]);
    });
  }

  self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);

    // Match only same origin and known caches
    // otherwise just perform fetch()
    if (url.origin !== location.origin || allAssets.indexOf(url.pathname) === -1) {
      if (DEBUG) {
        console.log('Path [' + url.pathname + '] does not match any assets');
      }

      // Will other 'fetch' events receive control now since I skipped
      // this handling?
      return event.respondWith(fetch(event.request));
    }

    var resource = caches.match(event.request).then(function (response) {
      if (response) {
        if (DEBUG) {
          console.log('Path [' + url.pathname + '] from cache');
        }

        return response;
      }

      // Load and cache know assets
      return fetch(event.request.clone()).then(function (response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          if (DEBUG) {
            console.log('Path [' + url.pathname + '] wrong response');
          }

          return response;
        }

        if (DEBUG) {
          console.log('Path [' + url.pathname + '] fetched');
        }

        var responseClone = response.clone();

        caches.open(CACHE_NAME).then(function (cache) {
          return cache.put(event.request, responseClone);
        }).then(function () {
          if (DEBUG) {
            console.log('Path [' + url.pathname + '] cached');
          }
        });

        return response;
      });
    });

    event.respondWith(resource);
  });
}
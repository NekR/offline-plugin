'use strict';

function WebpackServiceWorker(params) {
  var strategy = params.strategy;
  var assets = params.assets;
  var tagMap = {
    all: params.version,
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
    var deletion = deleteObsolete();

    if (assets.additional.length) {
      caching = strategy === 'changed' ? updateChanged() : cacheAssets('additional');
    } else {
      caching = Promise.resolve();
    }

    if (strategy === 'changed') {
      deletion = deletion;
    }

    event.waitUntil(Promise.all([caching, deletion]).then(function () {
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

      var caching = cache.addAll(diff);

      return Promise.all([Promise.all(deletion), caching]);
    });
  }

  self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);

    if (url.origin !== location.origin || allAssets.indexOf(url.pathname) === -1) {
      if (DEBUG) {
        console.log('Path [' + url.pathname + '] does not match any assets');
      }

      return event.respondWith(fetch(event.request));
    }

    var resource = caches.match(event.request).then(function (response) {
      if (response) {
        if (DEBUG) {
          console.log('Path [' + url.pathname + '] from cache');
        }

        return response;
      }

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
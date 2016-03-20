'use strict';

function WebpackServiceWorker(params) {
  var strategy = params.strategy;
  var assets = params.assets;
  var alwaysRevalidate = params.alwaysRevalidate;
  var ignoreSearch = params.ignoreSearch;

  var STACIC_CACHE_TAG = 'static';
  var TMP_CACHE_TAG = 'tmp';

  var tagMap = {
    all: params.version,
    changed: STACIC_CACHE_TAG,
    hash: params.hash
  };

  var CACHE_PREFIX = params.name;
  var CACHE_TAG = tagMap[strategy];
  var CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;
  var CACHE_TMP = CACHE_PREFIX + ':' + TMP_CACHE_TAG;

  mapAssets();

  var allAssets = [].concat(assets.main, assets.additional, assets.optional);

  self.addEventListener('install', function (event) {
    console.log('[SW]:', 'Install event');

    var installing = strategy === 'changed' ? cacheChanged('main', true) : cacheAssets('main');

    event.waitUntil(installing);
  });

  self.addEventListener('activate', function (event) {
    console.log('[SW]:', 'Activate event');

    // Delete all assets which start with CACHE_PREFIX and
    // is not current cache (CACHE_NAME)
    var activation = deleteObsolete();

    if (strategy === 'changed') {
      activation = activation.then(updateChanged);
    }

    activation = activation.then(cacheAdditional).then(function () {
      if (self.clients && self.clients.claim) {
        return self.clients.claim();
      }
    });

    event.waitUntil(activation);
  });

  function cacheAdditional() {
    if (!assets.additional.length) return;

    if (DEBUG) {
      console.log('[SW]:', 'Caching additional');
    }

    if (strategy === 'changed') {
      return cacheChanged('additional');
    } else {
      return cacheAssets('additional');
    }
  }

  function cacheAssets(section, options) {
    var bustValue = strategy === 'hash' ? params.hash : params.version;
    var batch = undefined;

    if (strategy !== 'changed') {
      batch = assets[section].map(function (asset) {
        return applyCacheBust(asset, bustValue);
      });
    } else if (alwaysRevalidate) {
      batch = assets[section].map(function (asset) {
        if (alwaysRevalidate.indexOf(asset) !== -1) {
          return applyCacheBust(asset, bustValue);
        }

        return asset;
      });
    } else {
      batch = assets[section];
    }

    return caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(batch).then(function () {
        console.groupCollapsed('[SW]:', 'Cached assets: ' + section);

        batch.forEach(function (asset) {
          console.log('Asset:', asset);
        });

        console.groupEnd();
      });
    });
  }

  function cacheChanged(section, useTmp) {
    var cache = undefined;

    return caches.open(CACHE_NAME).then(function (_cache) {
      cache = _cache;
      return _cache.keys();
    }).then(function (keys) {
      var paths = keys.map(function (req) {
        var url = new URL(req.url);
        url.search = '';

        return url.toString();
      });

      var changed = assets[section].filter(function (url) {
        return paths.indexOf(url) === -1;
      });

      if (!changed.length) return;

      (useTmp ? caches.open(CACHE_TMP) : Promise.resolve(cache)).then(function (cache) {
        return cache.addAll(changed);
      }).then(function () {
        console.groupCollapsed('[SW]:', 'Cached changed assets: ' + section);

        changed.forEach(function (asset) {
          console.log('Asset:', asset);
        });

        console.groupEnd();
      });
    });
  }

  function deleteObsolete() {
    return caches.keys().then(function (keys) {
      var all = keys.map(function (key) {
        if (key.indexOf(CACHE_PREFIX) !== 0 || key.indexOf(CACHE_NAME) === 0) return;

        if (strategy === 'changed' && (key.indexOf(CACHE_PREFIX + ':' + STACIC_CACHE_TAG) === 0 || key.indexOf(CACHE_PREFIX + ':' + TMP_CACHE_TAG) === 0)) return;

        console.log('[SW]:', 'Delete cache:', key);
        return caches['delete'](key);
      });

      return Promise.all(all).then(function () {
        return keys;
      });
    });
  }

  function updateChanged() {
    var cache = undefined;

    return caches.open(CACHE_NAME).then(function (_cache) {
      cache = _cache;
      return _cache.keys();
    }).then(function (keys) {
      var deletion = keys.filter(function (req) {
        var url = new URL(req.url);
        url.search = '';
        var urlString = url.toString();

        if (allAssets.indexOf(urlString) === -1) {
          req._urlString = urlString;
        }
      });

      if (!deletion.length) return;

      console.group('[SW]:', 'Deleting changed assets');
      deletion = deletion.map(function (req) {
        console.log('Asset:', req._urlString);
        return cache['delete'](req);
      });
      console.groupEnd();

      return Promise.all(deletion);
    }).then(function () {
      return caches.open(CACHE_TMP);
    }).then(function (tmpCache) {
      return Promise.all([tmpCache, tmpCache.keys(), tmpCache.matchAll()]);
    }).then(function (data) {
      var tmpCache = data[0];
      var requests = data[1];
      var responses = data[2];

      if (!requests.length) return;

      var all = requests.map(function (req, i) {
        return cache.put(req, responses[i]);
      });

      return Promise.all(all);
    }).then(function () {
      return caches['delete'](CACHE_TMP);
    });
  }

  self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);
    url.search = '';
    var urlString = url.toString();

    // Match only same origin and known caches
    // otherwise just perform fetch()
    if (event.request.method !== 'GET' || allAssets.indexOf(urlString) === -1) {
      if (DEBUG) {}
      // console.log('[SW]:', 'Path [' + urlString + '] does not match any assets');

      // Fix for https://twitter.com/wanderview/status/696819243262873600
      if (url.origin !== location.origin && navigator.userAgent.indexOf('Firefox/44') !== -1) {
        event.respondWith(fetch(event.request));
      }

      return;
    }

    var resource = caches.match(urlString, {
      cacheName: CACHE_NAME,
      ignoreSearch: true
    }).then(function (response) {
      if (response) {
        if (DEBUG) {
          console.log('[SW]:', 'Path [' + urlString + '] from cache');
        }

        return response;
      }

      // Load and cache known assets
      return fetch(urlString).then(function (response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          if (DEBUG) {
            console.log('[SW]:', 'Path [' + urlString + '] wrong response');
          }

          return response;
        }

        if (DEBUG) {
          console.log('[SW]:', 'Path [' + urlString + '] fetched');
        }

        var responseClone = response.clone();

        caches.open(CACHE_NAME).then(function (cache) {
          return cache.put(urlString, responseClone);
        }).then(function () {
          console.log('[SW]:', 'Cache asset: ' + urlString);
        });

        return response;
      });
    });

    event.respondWith(resource);
  });

  self.addEventListener('message', function (e) {
    var data = e.data;
    if (!data) return;

    switch (data.action) {
      case 'skipWaiting':
        {
          if (self.skipWaiting) self.skipWaiting();
        }break;
    }
  });

  function mapAssets() {
    Object.keys(assets).forEach(function (key) {
      assets[key] = assets[key].map(function (path) {
        var url = new URL(path, location);
        url.search = '';

        return url.toString();
      });
    });
  }

  function applyCacheBust(asset, key) {
    var hasQuery = asset.indexOf('?') !== -1;
    return asset + (hasQuery ? '&' : '?') + '__uncache=' + encodeURIComponent(key);
  }
}
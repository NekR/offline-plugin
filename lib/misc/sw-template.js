'use strict';

if (typeof DEBUG === 'undefined') {
  var DEBUG = false;
}

function WebpackServiceWorker(params) {
  var strategy = params.strategy;
  var assets = params.assets;
  var hashesMap = params.hashesMaps;
  var alwaysRevalidate = params.alwaysRevalidate;
  var ignoreSearch = params.ignoreSearch;

  var tagMap = {
    all: params.version,
    changed: params.version
  };

  var CACHE_PREFIX = params.name;
  var CACHE_TAG = tagMap[strategy];
  var CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;

  var STORED_DATA_KEY = '__offline_webpack__data';
  // new URL(, location).toString();

  mapAssets();

  var allAssets = [].concat(assets.main, assets.additional, assets.optional);

  self.addEventListener('install', function (event) {
    console.log('[SW]:', 'Install event');

    var installing = undefined;

    if (strategy === 'changed') {
      installing = cacheChanged('main');
    } else {
      installing = cacheAssets('main');
    }

    event.waitUntil(installing);
  });

  self.addEventListener('activate', function (event) {
    console.log('[SW]:', 'Activate event');

    var activation = cacheAdditional();

    /*if (strategy === 'changed') {
      activation = activation.then(updateChanged);
    }*/

    // Delete all assets which start with CACHE_PREFIX and
    // is not current cache (CACHE_NAME)
    activation = activation.then(deleteObsolete);
    activation = activation.then(function () {
      if (self.clients && self.clients.claim) {
        return self.clients.claim();
      }
    });

    event.waitUntil(activation);
  });

  function cacheAdditional() {
    if (!assets.additional.length) {
      return Promise.resolve();
    }

    if (DEBUG) {
      console.log('[SW]:', 'Caching additional');
    }

    var operation = undefined;

    if (strategy === 'changed') {
      operation = cacheChanged('additional');
    } else {
      operation = cacheAssets('additional');
    }

    // ignore fail of `additional` cache section
    return operation['catch'](function (e) {
      console.error('[SW]:', 'Cache section `additional` failed to load');
    });
  }

  function cacheAssets(section) {
    return caches.open(CACHE_NAME).then(function (cache) {
      return addAllNormalized(assets[section], batch, {
        bust: params.version
      });
    }).then(function () {
      console.groupCollapsed('[SW]:', 'Cached assets: ' + section);

      batch.forEach(function (asset) {
        console.log('Asset:', asset);
      });

      console.groupEnd();
    });
  }

  function cacheChanged(section) {
    return getLastCache().then(function (args) {
      if (!args) {
        return cacheAssets(section);
      }

      var lastCache = args[0];
      var lastKeys = args[1];
      var lastMap = args[2];

      var lastHashedAssets = Object.keys(lastMap).map(function (hash) {
        return lastMap[hash];
      });

      var lastUrls = lastKeys.map(function (req) {
        var url = new URL(req.url);
        url.search = '';

        return url.toString();
      });

      var sectionAssets = assets[section];
      var moved = [];
      var changed = sectionAssets.filter(function (url) {
        if (lastUrls.indexOf(url) === -1 || lastHashedAssets.indexOf(url) === -1) {
          return true;
        }

        return false;
      });

      Object.keys(hashesMap).forEach(function (hash) {
        var asset = hashesMap[hash];

        if (sectionAssets.indexOf(asset) === -1 || changed.indexOf(asset) !== -1 || moved.indexOf(asset) !== -1) return;

        var lastAsset = lastMap[hash];

        if (lastAsset && lastUrls.indexOf(lastAsset) !== -1) {
          moved.push([lastAsset, asset]);
        } else {
          changed.push(asset);
        }
      });

      var movedResponses = Prommise.all(moved.map(function (pair) {
        return lastCache.match(pair[0]).then(function (response) {
          return [pair[1], response];
        });
      }));

      return caches.open(CACHE_NAME).then(function (cache) {
        var move = movedResponses.then(function (responses) {
          return responses.map(function (pair) {
            return cache.put(pair[0], pair[1]);
          });
        });

        return Promise.all([Promise.all(move), addAllNormalized(cache, changed, {
          bust: params.version
        })]);
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

        console.log('[SW]:', 'Delete cache:', key);
        return caches['delete'](key);
      });

      return Promise.all(all).then(function () {
        return keys;
      });
    });
  }

  function getLastCache() {
    return caches.keys().then(function (keys) {
      var index = keys.length;
      var key = undefined;

      while (--index) {
        key = keys[index];

        if (key.indexOf(CACHE_PREFIX) === 0) {
          break;
        }
      }

      if (!key) return;

      return caches.open(key).then(function (cache) {
        return cache.match(STORED_DATA_KEY);
      }).then(function (response) {
        if (!response) return;

        return Promise.all([cache, cache.keys(), response.json()]);
      });
    })['catch'](function () {});
  }

  self.addEventListener('fetch', function (event) {
    var url = new URL(event.request.url);
    url.search = '';
    var urlString = url.toString();

    // Match only same origin and known caches
    // otherwise just perform fetch()
    if (event.request.method !== 'GET' || allAssets.indexOf(urlString) === -1) {
      // Fix for https://twitter.com/wanderview/status/696819243262873600
      if (url.origin !== location.origin && navigator.userAgent.indexOf('Firefox/44') !== -1) {
        event.respondWith(fetch(event.request));
      }

      return;
    }

    var resource = caches.match(urlString, {
      cacheName: CACHE_NAME
    }).then(function (response) {
      if (response) {
        if (DEBUG) {
          console.log('[SW]:', 'URL [' + urlString + '] from cache');
        }

        return response;
      }

      // Load and cache known assets
      return fetch(event.request).then(function (response) {
        if (!response || !response.ok) {
          if (DEBUG) {
            console.log('[SW]:', 'URL [' + urlString + '] wrong response: [' + response.status + '] ' + response.type);
          }

          return response;
        }

        if (DEBUG) {
          console.log('[SW]:', 'URL [' + urlString + '] fetched');
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

    hashesMap = Object.keys(hashesMap).reduce(function (result, hash) {
      var url = new URL(hashesMap[hash], location);
      url.search = '';

      result[hash] = url.toString();
      return result;
    }, {});
  }

  function applyCacheBust(asset, key) {
    var hasQuery = asset.indexOf('?') !== -1;
    return asset + (hasQuery ? '&' : '?') + '__uncache=' + encodeURIComponent(key);
  }
}

function addAllNormalized(cache, requests, options) {
  var bustValue = options && options.bust;

  return Promise.all(requests.map(function (request) {
    if (bustValue) {
      request = applyCacheBust(request, bustValue);
    }

    return fetch(request);
  })).then(function (responses) {
    if (responses.some(function (response) {
      return !response.ok;
    })) {
      return Promise.reject(new Error('Wrong response status'));
    }

    var addAll = responses.map(function (response, i) {
      return cache.put(requests[i], response);
    });

    return Promise.all(addAll);
  });
}

function getClientsURLs() {
  if (!self.clients) {
    return Promise.resolve([]);
  }

  return self.clients.matchAll({
    includeUncontrolled: true
  }).then(function (clients) {
    if (!clients.length) return [];

    var result = [];

    clients.forEach(function (client) {
      var url = new URL(client.url);
      url.search = '';
      url.hash = '';
      var urlString = url.toString();

      if (!result.length || result.indexOf(urlString) === -1) {
        result.push(urlString);
      }
    });

    return result;
  });
}
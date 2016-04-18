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

  var STATIC_CACHE_TAG = 'static';
  var TMP_CACHE_TAG = 'tmp';
  var HASHES_TAG = 'hashes';

  var tagMap = {
    all: params.version,
    changed: STATIC_CACHE_TAG
  };

  var CACHE_PREFIX = params.name;
  var CACHE_TAG = tagMap[strategy];
  var CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;
  var CACHE_TMP = CACHE_PREFIX + ':' + TMP_CACHE_TAG;
  var CACHE_HASHES = CACHE_PREFIX + ':' + HASHES_TAG;

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
    var bustValue = params.version;
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
      return addAllNormalized(cache, batch);
    }).then(function () {
      console.groupCollapsed('[SW]:', 'Cached assets: ' + section);

      batch.forEach(function (asset) {
        console.log('Asset:', asset);
      });

      console.groupEnd();
    });
  }

  function cacheChanged(section, useTmpCache) {
    var cache = undefined;

    var lastHashesMap = caches.match('/hashesMap', {
      cacheName: CACHE_HASHES
    })['catch'](function () {
      return void 0;
    });

    return caches.open(CACHE_NAME).then(function (_cache) {
      cache = _cache;
      return Promise.all([_cache.keys(), lastHashesMap]);
    }).then(function (args) {
      var keys = args[0];
      var lastMap = args[1];

      var paths = keys.map(function (req) {
        var url = new URL(req.url);
        url.search = '';

        return url.toString();
      });

      var sectionAssets = assets[section];
      var changed = sectionAssets.filter(function (url) {
        return paths.indexOf(url) === -1;
      });

      if (lastMap) {
        Object.keys(hashesMap).forEach(function (hash) {
          var asset = hashesMap[hash];

          if (lastMap.hasOwnProperty(hash)) {
            if (lastMap[hash] !== asset) {
              // moved
              var changedIndex = changed.indexOf(asset);

              if (changedIndex !== -1) {
                // moved and is in changed section,
                // remove from there to prevent re-downloading of it

                changed.splice(changedIndex, 1);
              }
            }

            return;
          }

          if (sectionAssets.indexOf(asset) !== -1 && changed.indexOf(asset) === -1) {
            changed.push(asset);
          }
        });
      }

      if (!changed.length) {
        var targetCache = useTmpCache ? caches.open(CACHE_TMP) : Promise.resolve(cache);

        targetCache.then(function (_targetCache) {
          return addAllNormalized(_targetCache, changed);
        }).then(function () {
          console.groupCollapsed('[SW]:', 'Cached changed assets: ' + section);

          changed.forEach(function (asset) {
            console.log('Asset:', asset);
          });

          console.groupEnd();
        });
      }
    });
  }

  function deleteObsolete() {
    return caches.keys().then(function (keys) {
      var all = keys.map(function (key) {
        if (key.indexOf(CACHE_PREFIX) !== 0 || key.indexOf(CACHE_NAME) === 0) return;

        if (strategy === 'changed' && (key.indexOf(CACHE_PREFIX + ':' + STATIC_CACHE_TAG) === 0 || key.indexOf(CACHE_TMP) === 0 || key.indexOf(CACHE_HASHES) === 0)) return;

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

    var lastHashesMap = caches.match('/hashesMap', {
      cacheName: CACHE_HASHES
    })['catch'](function () {
      return void 0;
    });

    return caches.open(CACHE_NAME).then(function (_cache) {
      cache = _cache;
      return Promise.all([_cache.keys(), lastHashesMap]);
    }).then(function (args) {
      var keys = args[0];
      var lastMap = args[1];

      var moved = [];
      var deletion = keys.filter(function (req) {
        var url = new URL(req.url);
        url.search = '';
        var urlString = url.toString();

        if (allAssets.indexOf(urlString) === -1) {
          req._urlString = urlString;
          return true;
        }
      });

      if (lastMap) {
        Object.keys(lastMap).forEach(function (lastHash) {
          var lastAsset = lastMap[lastHash];

          if (hashesMap.hasOwnProperty(lastHash)) {
            var newAsset = hashesMap[lastHash];

            if (lastAsset !== newAsset) {
              // moved
              moved.push([lastAsset, newAsset]);
              // deletion is performed after movement is done
              deletion.push(lastAsset);
            }
          } else {
            // deleted
            if (deletion.indexOf(lastAsset) === -1) {
              deletion.push(lastAsset);
            }
          }
        });
      }

      var operation = Promise.resolve();

      if (moved.length) {
        operation = operation.then(function () {
          return moved.map(function (pair) {
            return cache.match(pair[0]).then(function (response) {
              if (response) {
                return cache.put(pair[1], response);
              }

              return addAllNormalized(cache, [pair[1]]);
            });
          });
        }).then(function (moved) {
          return Promise.all(moved);
        }).then(function () {
          console.groupCollapsed('[SW]:', 'Cached moved assets: ' + section);

          moved.forEach(function (pair) {
            console.log('Pair:', pair);
          });

          console.groupEnd();
        });
      }

      if (deletion.length) {
        operation = operation.then(function () {
          console.group('[SW]:', 'Deleting changed assets');
          return deletion.map(function (req) {
            console.log('Asset:', req._urlString);
            return cache['delete'](req);
          });
          console.groupEnd();
        }).then(function (deletion) {
          return Promise.all(deletion);
        });
      }

      return operation;
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
          console.log('[SW]:', 'URL [' + urlString + '] from cache');
        }

        return response;
      }

      // Load and cache known assets
      return fetch(urlString).then(function (response) {
        if (!response || response.status !== 200 || !(response.type === 'basic' || response.type === 'cors')) {
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
  }

  function applyCacheBust(asset, key) {
    var hasQuery = asset.indexOf('?') !== -1;
    return asset + (hasQuery ? '&' : '?') + '__uncache=' + encodeURIComponent(key);
  }
}

function addAllNormalized(cache, requests) {
  return Promise.all(requests.map(function (request) {
    return fetch(request);
  })).then(function (responses) {
    if (responses.some(function (response) {
      return !response.ok;
    })) {
      return Promise.reject(new Error('Response not supported'));
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
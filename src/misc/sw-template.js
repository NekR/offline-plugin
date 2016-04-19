if (typeof DEBUG === 'undefined') {
  var DEBUG = false;
}

function WebpackServiceWorker(params) {
  const strategy = params.strategy;
  const assets = params.assets;
  let hashesMap = params.hashesMap;
  const alwaysRevalidate = params.alwaysRevalidate;
  const ignoreSearch = params.ignoreSearch;

  const tagMap = {
    all: params.version,
    changed: params.version
  };

  const CACHE_PREFIX = params.name;
  const CACHE_TAG = tagMap[strategy];
  const CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;

  const STORED_DATA_KEY = '__offline_webpack__data';
  // new URL(, location).toString();

  mapAssets();

  const allAssets = [].concat(assets.main, assets.additional, assets.optional);

  self.addEventListener('install', (event) => {
    console.log('[SW]:', 'Install event');

    let installing;

    if (strategy === 'changed') {
      installing = cacheChanged('main');
    } else {
      installing = cacheAssets('main');
    }

    event.waitUntil(installing);
  });

  self.addEventListener('activate', (event) => {
    console.log('[SW]:', 'Activate event');

    let activation = cacheAdditional();

    /*if (strategy === 'changed') {
      activation = activation.then(updateChanged);
    }*/

    // Delete all assets which start with CACHE_PREFIX and
    // is not current cache (CACHE_NAME)
    activation = activation.then(storeCacheData);
    activation = activation.then(deleteObsolete);
    activation = activation.then(() => {
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

    let operation;

    if (strategy === 'changed') {
      operation = cacheChanged('additional')
    } else {
      operation = cacheAssets('additional');
    }

    // ignore fail of `additional` cache section
    return operation.catch((e) => {
      console.error('[SW]:', 'Cache section `additional` failed to load');
    });
  }

  function cacheAssets(section) {
    const batch = assets[section];

    return caches.open(CACHE_NAME).then((cache) => {
      return addAllNormalized(cache, batch, {
        bust: params.version
      });
    }).then(() => {
      logGroup('Cached assets: ' + section, batch);
    }).catch(e => {
      console.error(e)
      throw e;
    });
  }

  function cacheChanged(section) {
    return getLastCache().then(args => {
      if (!args) {
        return cacheAssets(section);
      }

      const lastCache = args[0];
      const lastKeys = args[1];
      const lastData = args[2];

      const lastMap = lastData.hashmap;
      const lastVersion = lastData.version;

      if (!lastData.hashmap || lastVersion === params.version) {
        return cacheAssets(section);
      }

      const lastHashedAssets = Object.keys(lastMap).map(hash => {
        return lastMap[hash];
      });

      const lastUrls = lastKeys.map(req => {
        const url = new URL(req.url);
        url.search = '';

        return url.toString();
      });

      const sectionAssets = assets[section];
      const moved = [];
      const changed = sectionAssets.filter((url) => {
        if (lastUrls.indexOf(url) === -1 || lastHashedAssets.indexOf(url) === -1) {
          return true;
        }

        return false;
      });

      Object.keys(hashesMap).forEach(hash => {
        const asset = hashesMap[hash];

        if (
          sectionAssets.indexOf(asset) === -1 ||
          changed.indexOf(asset) !== -1 ||
          moved.indexOf(asset) !== -1
        ) return;

        const lastAsset = lastMap[hash];

        if (lastAsset && lastUrls.indexOf(lastAsset) !== -1) {
          moved.push([
            lastAsset,
            asset
          ]);
        } else {
          changed.push(asset);
        }
      });

      logGroup('Changed assets: ' + section, changed);
      logGroup('Moved assets: ' + section, moved);

      const movedResponses = Promise.all(moved.map((pair) => {
        return lastCache.match(pair[0]).then((response) => {
          return [pair[1], response];
        })
      }));

      return caches.open(CACHE_NAME).then((cache) => {
        const move = movedResponses.then((responses) => {
          return Promise.all(responses.map((pair) => {
            return cache.put(pair[0], pair[1]);
          }));
        });

        return Promise.all([
          move,
          addAllNormalized(cache, changed, {
            bust: params.version
          })
        ]);
      });
    });
  }

  function deleteObsolete() {
    return caches.keys().then((keys) => {
      const all = keys.map((key) => {
        if (key.indexOf(CACHE_PREFIX) !== 0 || key.indexOf(CACHE_NAME) === 0) return;

        console.log('[SW]:', 'Delete cache:', key);
        return caches.delete(key);
      });

      return Promise.all(all).then(() => keys);
    });
  }

  function getLastCache() {
    return caches.keys().then(keys => {
      let index = keys.length;
      let key;

      while (index--) {
        key = keys[index];

        if (key.indexOf(CACHE_PREFIX) === 0) {
          break;
        }
      }

      if (!key) return;

      let cache;

      return caches.open(key).then(_cache => {
        cache = _cache;
        return _cache.match(new URL(STORED_DATA_KEY, location).toString());
      }).then(response => {
        if (!response) return;

        return Promise.all([cache, cache.keys(), response.json()]);
      });
    });
  }

  function storeCacheData() {
    return caches.open(CACHE_NAME).then(cache => {
      const data = new Response(JSON.stringify({
        version: params.version,
        hashmap: hashesMap
      }));

      return cache.put(new URL(STORED_DATA_KEY, location).toString(), data);
    });
  }

  self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    url.search = '';
    const urlString = url.toString();

    // Match only same origin and known caches
    // otherwise just perform fetch()
    if (
      event.request.method !== 'GET' ||
      allAssets.indexOf(urlString) === -1
    ) {
      // Fix for https://twitter.com/wanderview/status/696819243262873600
      if (url.origin !== location.origin && navigator.userAgent.indexOf('Firefox/44') !== -1) {
        event.respondWith(fetch(event.request));
      }

      return;
    }

    const resource = caches.match(urlString, {
      cacheName: CACHE_NAME
    }).then((response) => {
      if (response) {
        if (DEBUG) {
          console.log('[SW]:', `URL [${ urlString }] from cache`);
        }

        return response;
      }

      // Load and cache known assets
      return fetch(event.request).then((response) => {
        if (!response || !response.ok) {
          if (DEBUG) {
            console.log(
              '[SW]:',
              `URL [${ urlString }] wrong response: [${ response.status }] ${ response.type }`
            );
          }

          return response;
        }

        if (DEBUG) {
          console.log('[SW]:', `URL [${ urlString }] fetched`);
        }

        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          return cache.put(urlString, responseClone);
        }).then(() => {
          console.log('[SW]:', 'Cache asset: ' + urlString);
        });

        return response;
      });
    });

    event.respondWith(resource);
  });

  self.addEventListener('message', (e) => {
    const data = e.data;
    if (!data) return;

    switch (data.action) {
      case 'skipWaiting': {
        if (self.skipWaiting) self.skipWaiting();
      } break;
    }
  });

  function mapAssets() {
    Object.keys(assets).forEach((key) => {
      assets[key] = assets[key].map((path) => {
        const url = new URL(path, location);
        url.search = '';

        return url.toString();
      });
    });

    hashesMap = Object.keys(hashesMap).reduce((result, hash) => {
      const url = new URL(hashesMap[hash], location);
      url.search = '';

      result[hash] = url.toString();
      return result;
    }, {});
  }
}

function addAllNormalized(cache, requests, options) {
  const bustValue = options && options.bust;

  return Promise.all(requests.map((request) => {
    if (bustValue) {
      request = applyCacheBust(request, bustValue);
    }

    return fetch(request);
  })).then((responses) => {
    if (responses.some(response => !response.ok)) {
      return Promise.reject(new Error('Wrong response status'));
    }

    const addAll = responses.map((response, i) => {
      return cache.put(requests[i], response)
    });

    return Promise.all(addAll);
  });
}

function applyCacheBust(asset, key) {
  const hasQuery = asset.indexOf('?') !== -1;
  return asset + (hasQuery ? '&' : '?') + '__uncache=' + encodeURIComponent(key);
}

function getClientsURLs() {
  if (!self.clients) {
    return Promise.resolve([]);
  }

  return self.clients.matchAll({
    includeUncontrolled: true
  }).then((clients) => {
    if (!clients.length) return [];

    const result = [];

    clients.forEach((client) => {
      const url = new URL(client.url);
      url.search = '';
      url.hash = '';
      const urlString = url.toString();

      if (!result.length || result.indexOf(urlString) === -1) {
        result.push(urlString);
      }
    });

    return result;
  });
}

function logGroup(title, assets) {
  console.groupCollapsed('[SW]:', title);

  assets.forEach((asset) => {
    console.log('Asset:', asset);
  });

  console.groupEnd();
}
if (typeof DEBUG === 'undefined') {
  var DEBUG = false;
}

function WebpackServiceWorker(params, helpers) {
  const loaders = helpers.loaders;
  const cacheMaps = helpers.cacheMaps;

  const strategy = params.strategy;
  const responseStrategy = params.responseStrategy;

  const assets = params.assets;
  const loadersMap = params.loaders || {};

  let hashesMap = params.hashesMap;
  let externals = params.externals;

  // Not used yet
  // const alwaysRevalidate = params.alwaysRevalidate;
  // const ignoreSearch = params.ignoreSearch;
  // const preferOnline = params.preferOnline;

  const CACHE_PREFIX = params.name;
  const CACHE_TAG = params.version;
  const CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;

  const STORED_DATA_KEY = '__offline_webpack__data';

  mapAssets();

  const allAssets = [].concat(assets.main, assets.additional, assets.optional);
  const navigateFallbackURL = params.navigateFallbackURL;
  const navigateFallbackForRedirects = params.navigateFallbackForRedirects;

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

    // Delete all assets which name starts with CACHE_PREFIX and
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
      operation = cacheChanged('additional');
    } else {
      operation = cacheAssets('additional');
    }

    // Ignore fail of `additional` cache section
    return operation.catch((e) => {
      console.error('[SW]:', 'Cache section `additional` failed to load');
    });
  }

  function cacheAssets(section) {
    const batch = assets[section];

    return caches.open(CACHE_NAME).then((cache) => {
      return addAllNormalized(cache, batch, {
        bust: params.version,
        request: params.prefetchRequest
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
        url.hash = '';

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

        // Return if not in sectionAssets or in changed or moved array
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
            bust: params.version,
            request: params.prefetchRequest
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

      return Promise.all(all);
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
    url.hash = '';

    let urlString = url.toString();

    // Not external, so search part of the URL should be stripped,
    // if it's external URL, the search part should be kept
    if (externals.indexOf(urlString) === -1) {
      url.search = '';
      urlString = url.toString();
    }

    // Handle only GET requests
    const isGET = event.request.method === 'GET';
    let assetMatches = allAssets.indexOf(urlString) !== -1;
    let cacheUrl = urlString;

    if (!assetMatches) {
      let cacheRewrite = matchCacheMap(event.request);

      if (cacheRewrite) {
        cacheUrl = cacheRewrite;
        assetMatches = true;
      }
    }

    if (!assetMatches && isGET) {
      // If isn't a cached asset and is a navigation request,
      // fallback to navigateFallbackURL if available
      if (navigateFallbackURL && isNavigateRequest(event.request)) {
        event.respondWith(
          handleNavigateFallback(fetch(event.request))
        );

        return;
      }
    }

    if (!assetMatches || !isGET) {
      // Fix for https://twitter.com/wanderview/status/696819243262873600
      if (
        url.origin !== location.origin &&
        navigator.userAgent.indexOf('Firefox/44.') !== -1
      ) {
        event.respondWith(fetch(event.request));
      }

      return;
    }

    // Logic of caching / fetching is here
    // * urlString -- url to match from the CACHE_NAME
    // * event.request -- original Request to perform fetch() if necessary
    let resource;

    if (responseStrategy === 'network-first') {
      resource = networkFirstResponse(event, urlString, cacheUrl);
    }
    // 'cache-first'
    // (responseStrategy has been validated before)
    else {
      resource = cacheFirstResponse(event, urlString, cacheUrl);
    }

    if (navigateFallbackURL && isNavigateRequest(event.request)) {
      resource = handleNavigateFallback(resource);
    }

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

  function cacheFirstResponse(event, urlString, cacheUrl) {
    return cachesMatch(cacheUrl, CACHE_NAME)
    .then((response) => {
      if (response) {
        if (DEBUG) {
          console.log('[SW]:', `URL [${ cacheUrl }](${ urlString }) from cache`);
        }

        return response;
      }

      // Load and cache known assets
      let fetching = fetch(event.request).then((response) => {
        if (!response.ok) {
          if (DEBUG) {
            console.log(
              '[SW]:',
              `URL [${ urlString }] wrong response: [${ response.status }] ${ response.type }`
            );
          }

          return response;
        }

        if (DEBUG) {
          console.log('[SW]:', `URL [${ urlString }] from network`);
        }

        if (cacheUrl === urlString) {
          const responseClone = response.clone();
          const storing = caches.open(CACHE_NAME).then((cache) => {
            return cache.put(urlString, responseClone);
          }).then(() => {
            console.log('[SW]:', 'Cache asset: ' + urlString);
          });

          event.waitUntil(storing);
        }

        return response;
      });

      return fetching;
    });
  }

  function networkFirstResponse(event, urlString, cacheUrl) {
    return fetch(event.request)
      .then((response) => {
        if (response.ok) {
          if (DEBUG) {
            console.log('[SW]:', `URL [${ urlString }] from network`);
          }

          return response
        }

        // Throw to reach the code in the catch below
        throw new Error('Response is not ok');
      })
      // This needs to be in a catch() and not just in the then() above
      // cause if your network is down, the fetch() will throw
      .catch(() => {
        if (DEBUG) {
          console.log('[SW]:', `URL [${ urlString }] from cache if possible`);
        }

        return cachesMatch(cacheUrl, CACHE_NAME);
      });
  }

  function handleNavigateFallback(fetching) {
    return fetching
      .catch(() => {})
      .then((response) => {
        const isOk = response && response.ok;
        const isRedirect = response && response.type === 'opaqueredirect';

        if (isOk || (isRedirect && !navigateFallbackForRedirects)) {
          return response;
        }

        if (DEBUG) {
          console.log('[SW]:', `Loading navigation fallback [${ navigateFallbackURL }] from cache`);
        }

        return cachesMatch(navigateFallbackURL, CACHE_NAME);
      });
  }

  function mapAssets() {
    Object.keys(assets).forEach((key) => {
      assets[key] = assets[key].map((path) => {
        const url = new URL(path, location);

        url.hash = '';

        if (externals.indexOf(path) === -1) {
          url.search = '';
        }

        return url.toString();
      });
    });

    Object.keys(loadersMap).forEach((key) => {
      loadersMap[key] = loadersMap[key].map((path) => {
        const url = new URL(path, location);

        url.hash = '';

        if (externals.indexOf(path) === -1) {
          url.search = '';
        }

        return url.toString();
      });
    });

    hashesMap = Object.keys(hashesMap).reduce((result, hash) => {
      const url = new URL(hashesMap[hash], location);
      url.search = '';
      url.hash = '';

      result[hash] = url.toString();
      return result;
    }, {});

    externals = externals.map((path) => {
      const url = new URL(path, location);
      url.hash = '';

      return url.toString();
    });
  }

  function addAllNormalized(cache, requests, options) {
    const allowLoaders = options.allowLoaders !== false;
    const bustValue = options && options.bust;
    const requestInit = options.request || {
      credentials: 'omit',
      mode: 'cors'
    };

    return Promise.all(requests.map((request) => {
      if (bustValue) {
        request = applyCacheBust(request, bustValue);
      }

      return fetch(request, requestInit).then(fixRedirectedResponse);
    })).then((responses) => {
      if (responses.some(response => !response.ok)) {
        return Promise.reject(new Error('Wrong response status'));
      }

      let extracted = [];
      let addAll = responses.map((response, i) => {
        if (allowLoaders) {
          extracted.push(extractAssetsWithLoaders(requests[i], response));
        }

        return cache.put(requests[i], response);
      });

      if (extracted.length) {
        const newOptions = copyObject(options);
        newOptions.allowLoaders = false;

        let waitAll = addAll;

        addAll = Promise.all(extracted).then((all) => {
          const extractedRequests = [].concat.apply([], all);

          if (requests.length) {
            waitAll = waitAll.concat(
              addAllNormalized(cache, extractedRequests, newOptions)
            );
          }

          return Promise.all(waitAll);
        });
      } else {
        addAll = Promise.all(addAll);
      }

      return addAll;
    });
  }

  function extractAssetsWithLoaders(request, response) {
    const all = Object.keys(loadersMap).map((key) => {
      const loader = loadersMap[key];

      if (loader.indexOf(request) !== -1 && loaders[key]) {
        return loaders[key](response.clone());
      }
    }).filter(a => !!a);

    return Promise.all(all).then((all) => {
      return [].concat.apply([], all);
    });
  }

  function matchCacheMap(request) {
    const urlString = request.url;
    const url = new URL(urlString);

    let requestType;

    if (request.mode === 'navigate') {
      requestType = 'navigate';
    } else if (url.origin === location.origin) {
      requestType = 'same-origin';
    } else {
      requestType = 'cross-origin';
    }

    for (let i = 0; i < cacheMaps.length; i++) {
      const map = cacheMaps[i];

      if (!map) continue;
      if (map.requestTypes && map.requestTypes.indexOf(requestType) === -1) {
        continue
      }

      let newString;

      if (typeof map.match === 'function') {
        newString = map.match(url, request);
      } else {
        newString = urlString.replace(map.match, map.to);
      }

      if (newString && newString !== urlString) {
        return newString;
      }
    }
  }
}

function cachesMatch(request, cacheName) {
  return caches.match(request, {
    cacheName: cacheName
  }).then(response => {
    if (isNotRedirectedResponse()) {
      return response;
    }

    // Fix already cached redirected responses
    return fixRedirectedResponse(response).then(fixedResponse => {
      return caches.open(cacheName).then(cache => {
        return cache.put(request, fixedResponse);
      }).then(() => fixedResponse);
    });
  })
  // Return void if error happened (cache not found)
  .catch(() => {});
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

function isNavigateRequest(request) {
  return request.mode === 'navigate' ||
    request.headers.get('Upgrade-Insecure-Requests') ||
    (request.headers.get('Accept') || '').indexOf('text/html') !== -1;
}

function isNotRedirectedResponse(response) {
  return (
    !response || !response.redirected ||
    !response.ok || response.type === 'opaqueredirect'
  );
}

// Based on https://github.com/GoogleChrome/sw-precache/pull/241/files#diff-3ee9060dc7a312c6a822cac63a8c630bR85
function fixRedirectedResponse(response) {
  if (isNotRedirectedResponse(response)) {
    return Promise.resolve(response);
  }

  const body = 'body' in response ?
    Promise.resolve(response.body) : response.blob();

  return body.then(data => {
    return new Response(data, {
      headers: response.headers,
      status: response.status
    });
  });
}

function copyObject(original) {
  return Object.keys(original).reduce((result, key) => {
    result[key] = original[key];
    return result;
  }, {});
}

function logGroup(title, assets) {
  console.groupCollapsed('[SW]:', title);

  assets.forEach((asset) => {
    console.log('Asset:', asset);
  });

  console.groupEnd();
}

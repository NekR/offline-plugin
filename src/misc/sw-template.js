if (typeof DEBUG === 'undefined') {
  var DEBUG = false;
}

function WebpackServiceWorker(params, helpers) {
  const cacheMaps = helpers.cacheMaps;
  // navigationPreload: true, { map: (URL) => URL, test: (URL) => boolean }
  const navigationPreload = helpers.navigationPreload;

  // (update)strategy: changed, all
  const strategy = params.strategy;
  // responseStrategy: cache-first, network-first
  const responseStrategy = params.responseStrategy;

  const assets = params.assets;

  let hashesMap = params.hashesMap;
  let externals = params.externals;

  const prefetchRequest = params.prefetchRequest || {
    credentials: 'same-origin',
    mode: 'cors'
  };

  const CACHE_PREFIX = params.name;
  const CACHE_TAG = params.version;
  const CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;

  const PRELOAD_CACHE_NAME = CACHE_PREFIX + '$preload';
  const STORED_DATA_KEY = '__offline_webpack__data';

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

    // Delete all assets which name starts with CACHE_PREFIX and
    // is not current cache (CACHE_NAME)
    activation = activation.then(storeCacheData);
    activation = activation.then(deleteObsolete);
    activation = activation.then(() => {
      if (self.clients && self.clients.claim) {
        return self.clients.claim();
      }
    });

    if (navigationPreload && self.registration.navigationPreload) {
      activation = Promise.all([
        activation,
        self.registration.navigationPreload.enable()
      ]);
    }

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
        request: prefetchRequest,
        failAll: section === 'main'
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
            request: prefetchRequest,
            failAll: section === 'main',
            deleteFirst: section !== 'main'
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
    // Handle only GET requests
    if (event.request.method !== 'GET') {
      return;
    }

    // This prevents some weird issue with Chrome DevTools and 'only-if-cached'
    // Fixes issue #385, also ref to:
    // - https://github.com/paulirish/caltrainschedule.io/issues/49
    // - https://bugs.chromium.org/p/chromium/issues/detail?id=823392
    if (
      event.request.cache === 'only-if-cached' &&
      event.request.mode !== 'same-origin'
    ) {
      return;
    }

    const url = new URL(event.request.url);
    url.hash = '';

    let urlString = url.toString();

    // Not external, so search part of the URL should be stripped,
    // if it's external URL, the search part should be kept
    if (externals.indexOf(urlString) === -1) {
      url.search = '';
      urlString = url.toString();
    }

    let assetMatches = allAssets.indexOf(urlString) !== -1;
    let cacheUrl = urlString;

    if (!assetMatches) {
      let cacheRewrite = matchCacheMap(event.request);

      if (cacheRewrite) {
        cacheUrl = cacheRewrite;
        assetMatches = true;
      }
    }

    if (!assetMatches) {
      // Use request.mode === 'navigate' instead of isNavigateRequest
      // because everything what supports navigationPreload supports
      // 'navigate' request.mode
      if (event.request.mode === 'navigate') {
        // Requesting with fetchWithPreload().
        // Preload is used only if navigationPreload is enabled and
        // navigationPreload mapping is not used.
        if (navigationPreload === true) {
          event.respondWith(fetchWithPreload(event));
          return;
        }
      }

      // Something else, positive, but not `true`
      if (navigationPreload) {
        const preloadedResponse = retrivePreloadedResponse(event);

        if (preloadedResponse) {
          event.respondWith(preloadedResponse);
          return;
        }
      }

      // Logic exists here if no cache match
      return;
    }

    // Cache handling/storing/fetching starts here
    let resource;

    if (responseStrategy === 'network-first') {
      resource = networkFirstResponse(event, urlString, cacheUrl);
    }
    // 'cache-first' otherwise
    // (responseStrategy has been validated before)
    else {
      resource = cacheFirstResponse(event, urlString, cacheUrl);
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
    handleNavigationPreload(event);

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
    return fetchWithPreload(event)
      .then((response) => {
        if (response.ok) {
          if (DEBUG) {
            console.log('[SW]:', `URL [${ urlString }] from network`);
          }

          return response
        }

        // Throw to reach the code in the catch below
        throw response;
      })
      // This needs to be in a catch() and not just in the then() above
      // cause if your network is down, the fetch() will throw
      .catch((erroredResponse) => {
        if (DEBUG) {
          console.log('[SW]:', `URL [${ urlString }] from cache if possible`);
        }

        return cachesMatch(cacheUrl, CACHE_NAME).then(response => {
          if (response) {
            return response;
          }

          if (erroredResponse instanceof Response) {
            return erroredResponse;
          }

          // Not a response at this point, some other error
          throw erroredResponse;
          // return Response.error();
        });
      });
  }

  function handleNavigationPreload(event) {
    if (
      navigationPreload && typeof navigationPreload.map === 'function' &&
      // Use request.mode === 'navigate' instead of isNavigateRequest
      // because everything what supports navigationPreload supports
      // 'navigate' request.mode
      event.preloadResponse && event.request.mode === 'navigate'
    ) {
      const mapped = navigationPreload.map(
        new URL(event.request.url), event.request
      );

      if (mapped) {
        storePreloadedResponse(mapped, event);
      }
    }
  }

  // Temporary in-memory store for faster access
  let navigationPreloadStore = new Map();

  function storePreloadedResponse(_url, event) {
    const url = new URL(_url, location);
    const preloadResponsePromise = event.preloadResponse;

    navigationPreloadStore.set(preloadResponsePromise, {
      url: url,
      response: preloadResponsePromise
    });

    const isSamePreload = () => {
      return navigationPreloadStore.has(preloadResponsePromise);
    };

    const storing = preloadResponsePromise.then(res => {
      // Return if preload isn't enabled or hasn't happened
      if (!res) return;

      // If navigationPreloadStore already consumed
      // or navigationPreloadStore already contains another preload,
      // then do not store anything and return
      if (!isSamePreload()) {
        return;
      }

      const clone = res.clone();

      // Storing the preload response for later consume (hasn't yet been consumed)
      return caches.open(PRELOAD_CACHE_NAME).then(cache => {
        if (!isSamePreload()) return;

        return cache.put(url, clone).then(() => {
          if (!isSamePreload()) {
            return caches.open(PRELOAD_CACHE_NAME)
              .then(cache => cache.delete(url))
          }
        });
      });
    });

    event.waitUntil(storing);
  }

  function retriveInMemoryPreloadedResponse(url) {
    if (!navigationPreloadStore) {
      return;
    }

    let foundResponse;
    let foundKey;

    navigationPreloadStore.forEach((store, key) => {
      if (store.url.href === url.href) {
        foundResponse = store.response;
        foundKey = key;
      }
    });

    if (foundResponse) {
      navigationPreloadStore.delete(foundKey);
      return foundResponse;
    }
  }

  function retrivePreloadedResponse(event) {
    const url = new URL(event.request.url);

    if (
      self.registration.navigationPreload &&
      navigationPreload && navigationPreload.test &&
      navigationPreload.test(url, event.request)
    ) {} else {
      return;
    }

    const fromMemory = retriveInMemoryPreloadedResponse(url);
    const request = event.request;

    if (fromMemory) {
      event.waitUntil(
        caches.open(PRELOAD_CACHE_NAME).then(cache => cache.delete(request))
      );

      return fromMemory;
    }

    return cachesMatch(request, PRELOAD_CACHE_NAME).then(response => {
      if (response) {
        event.waitUntil(
          caches.open(PRELOAD_CACHE_NAME).then(cache => cache.delete(request))
        );
      }

      return response || fetch(event.request);
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
    requests = requests.slice();

    const bustValue = options.bust;
    const failAll = options.failAll !== false;
    const deleteFirst = options.deleteFirst === true;
    const requestInit = options.request || {
      credentials: 'omit',
      mode: 'cors'
    };

    let deleting = Promise.resolve();

    if (deleteFirst) {
      deleting = Promise.all(requests.map((request) => {
        return cache.delete(request).catch(() => {});
      }));
    }

    return Promise.all(requests.map((request) => {
      if (bustValue) {
        request = applyCacheBust(request, bustValue);
      }

      return fetch(request, requestInit)
        .then(fixRedirectedResponse).then((response) => {
          if (!response.ok) {
            return { error: true };
          }

          return { response };
        }, () => ({ error: true }));
    })).then((responses) => {
      if (failAll && responses.some(data => data.error)) {
        return Promise.reject(new Error('Wrong response status'));
      }

      if (!failAll) {
        responses = responses.filter((data, i) => {
          if (!data.error) { return true; }

          requests.splice(i, 1);
          return false;
        });
      }

      return deleting.then(() => {
        let addAll = responses.map(({ response }, i) => {
          return cache.put(requests[i], response);
        });

        return Promise.all(addAll);
      });
    });
  }

  function matchCacheMap(request) {
    const urlString = request.url;
    const url = new URL(urlString);

    let requestType;

    if (isNavigateRequest(request)) {
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

  function fetchWithPreload(event) {
    if (!event.preloadResponse || navigationPreload !== true) {
      return fetch(event.request);
    }

    return event.preloadResponse.then(response => {
      return response || fetch(event.request);
    });
  }
}

function cachesMatch(request, cacheName) {
  return caches.match(request, {
    cacheName: cacheName
  }).then(response => {
    if (isNotRedirectedResponse(response)) {
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
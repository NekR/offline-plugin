function WebpackServiceWorker(params) {
  const strategy = params.strategy;
  const assets = params.assets;
  const alwaysRevalidate = params.alwaysRevalidate;
  const ignoreSearch = params.ignoreSearch;

  const STACIC_CACHE_TAG = 'static';
  const TMP_CACHE_TAG = 'tmp';

  const tagMap = {
    all: params.version,
    changed: STACIC_CACHE_TAG,
    hash: params.hash
  };

  const CACHE_PREFIX = params.name;
  const CACHE_TAG = tagMap[strategy];
  const CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;
  const CACHE_TMP = CACHE_PREFIX + ':' + TMP_CACHE_TAG;

  mapAssets();

  const allAssets = [].concat(assets.main, assets.additional, assets.optional);

  self.addEventListener('install', (event) => {
    console.log('[SW]:', 'Install event');

    const installing = strategy === 'changed' ?
      cacheChanged('main', true) : cacheAssets('main');

    event.waitUntil(installing);
  });


  self.addEventListener('activate', (event) => {
    console.log('[SW]:', 'Activate event');

    // Delete all assets which start with CACHE_PREFIX and
    // is not current cache (CACHE_NAME)
    let activation = deleteObsolete();

    if (strategy === 'changed') {
      activation = activation.then(updateChanged);
    }

    activation = activation.then(cacheAdditional).then(() => {
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
      return cacheChanged('additional')
    } else {
      return cacheAssets('additional');
    }
  }

  function cacheAssets(section, options) {
    const bustValue = strategy === 'hash' ? params.hash : params.version;
    let batch;

    if (strategy !== 'changed') {
      batch = assets[section].map((asset) => {
        return applyCacheBust(asset, bustValue);
      });
    } else if (alwaysRevalidate) {
      batch = assets[section].map((asset) => {
        if (alwaysRevalidate.indexOf(asset) !== -1) {
          return applyCacheBust(asset, bustValue);
        }

        return asset;
      });
    } else {
      batch = assets[section];
    }

    return caches.open(CACHE_NAME).then((cache) => {
      return addAllNormalized(cache, batch);
    }).then(() => {
      console.groupCollapsed('[SW]:', 'Cached assets: ' + section);

      batch.forEach((asset) => {
        console.log('Asset:', asset);
      });

      console.groupEnd();
    });
  }

  function cacheChanged(section, useTmp) {
    let cache;

    return caches.open(CACHE_NAME).then((_cache) => {
      cache = _cache;
      return _cache.keys();
    }).then(keys => {
      const paths = keys.map(req => {
        const url = new URL(req.url);
        url.search = '';

        return url.toString();
      });

      const changed = assets[section].filter((url) => {
        return paths.indexOf(url) === -1;
      });

      if (!changed.length) return;

      (useTmp ? caches.open(CACHE_TMP) : Promise.resolve(cache))
      .then((cache) => {
        return addAllNormalized(cache, changed)
      }).then(() => {
        console.groupCollapsed('[SW]:', 'Cached changed assets: ' + section);

        changed.forEach((asset) => {
          console.log('Asset:', asset);
        });

        console.groupEnd();
      });
    })
  }

  function deleteObsolete() {
    return caches.keys().then((keys) => {
      const all = keys.map((key) => {
        if (key.indexOf(CACHE_PREFIX) !== 0 || key.indexOf(CACHE_NAME) === 0) return;

        if (strategy === 'changed' && (
          key.indexOf(CACHE_PREFIX + ':' + STACIC_CACHE_TAG) === 0 ||
          key.indexOf(CACHE_PREFIX + ':' + TMP_CACHE_TAG) === 0
        )) return;

        console.log('[SW]:', 'Delete cache:', key);
        return caches.delete(key);
      });

      return Promise.all(all).then(() => keys);
    });
  }

  function updateChanged() {
    let cache;

    return caches.open(CACHE_NAME).then((_cache) => {
      cache = _cache;
      return _cache.keys();
    }).then((keys) => {
      let deletion = keys.filter((req) => {
        const url = new URL(req.url);
        url.search = '';
        const urlString = url.toString();

        if (allAssets.indexOf(urlString) === -1) {
          req._urlString = urlString;
        }
      });

      if (!deletion.length) return;

      console.group('[SW]:', 'Deleting changed assets');
      deletion = deletion.map((req) => {
        console.log('Asset:', req._urlString);
        return cache.delete(req);
      });
      console.groupEnd();

      return Promise.all(deletion);
    }).then(() => {
      return caches.open(CACHE_TMP);
    }).then((tmpCache) => {
      return Promise.all([
        tmpCache,
        tmpCache.keys(),
        tmpCache.matchAll(),
      ]);
    }).then((data) => {
      const tmpCache = data[0];
      const requests = data[1];
      const responses = data[2];

      if (!requests.length) return;

      const all = requests.map((req, i) => {
        return cache.put(req, responses[i]);
      });

      return Promise.all(all);
    }).then(() => {
      return caches.delete(CACHE_TMP);
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
      cacheName: CACHE_NAME,
      ignoreSearch: true
    }).then((response) => {
      if (response) {
        if (DEBUG) {
          console.log('[SW]:', `URL [${ urlString }] from cache`);
        }

        return response;
      }

      // Load and cache known assets
      return fetch(urlString).then((response) => {
        if (
          !response || response.status !== 200 ||
          !(response.type === 'basic' || response.type === 'cors')
        ) {
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
  }

  function applyCacheBust(asset, key) {
    const hasQuery = asset.indexOf('?') !== -1;
    return asset + (hasQuery ? '&' : '?') + '__uncache=' + encodeURIComponent(key);
  }
}

function addAllNormalized(cache, requests) {
  return Promise.all(requests.map(fetch)).then((responses) => {
    if (responses.some(response => !response.ok)) {
      return Promise.reject(new Error('Response not supported'));
    }

    const addAll = responses.map((response, i) => {
      return cache.put(requests[i], response)
    });

    return Promise.all(addAll);
  });
}
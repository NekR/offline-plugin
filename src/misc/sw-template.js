function WebpackServiceWorker(params) {
  const scopeURL = new URL(registration.scope);

  const strategy = params.strategy;
  const assets = params.assets;
  const tagMap = {
    all: params.version,
    // Hash is included in output file, but not used in cache name,
    // this allows updating only changed files in `additional` section and
    // always revalidation files of `main` section when hash changed
    changed: 'static',
    hash: params.hash
  };

  const CACHE_PREFIX = params.name;
  const CACHE_TAG = tagMap[strategy];
  const CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;

  if (params.relativePaths) {
    mapAssets();
  }

  const allAssets = [].concat(assets.main, assets.additional, assets.optional);

  self.addEventListener('install', (event) => {
    console.log('[SW]:', 'Install event');

    const installing = cacheAssets('main', {
      bustCache: strategy !== 'changed'
    }).then(cacheAdditional);
    event.waitUntil(installing);
  });


  self.addEventListener('activate', (event) => {
    console.log('[SW]:', 'Activate event');

    // Delete all assets which start with CACHE_PREFIX and
    // is not current cache (CACHE_NAME)
    let deletion = deleteObsolete();

    if (strategy === 'changed') {
      deletion = deletion.then(deleteChanged);
    }

    event.waitUntil(deletion.then(() => {
      if (self.clients && self.clients.claim) {
        return self.clients.claim();
      }
    }));
  });

  function cacheAdditional() {
    if (!assets.additional.length) return;

    if (DEBUG) {
      console.log('[SW]:', 'Caching additional');
    }

    if (strategy === 'changed') {
      cacheChanged();
    } else {
      cacheAssets('additional', {
        bustCache: true
      });
    }
  }

  function cacheAssets(section, options) {
    const bustCache = options && options.bustCache;
    let batch;

    if (bustCache) {
      const time = Date.now();

      batch = assets[section].map((asset) => {
        return applyCacheBust(asset, time);
      });
    } else {
      batch = assets[section];
    }

    return caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll().then(() => {
        console.groupCollapsed('[SW]:', 'Cached assets: ' + section);

        assets[section].forEach((asset) => {
          console.log('Asset:', asset);
        });

        console.groupEnd();
      });
    });
  }

  function cacheChanged() {
    let cache;

    return caches.open(CACHE_NAME).then((_cache) => {
      cache = _cache;
      return _cache.keys();
    }).then(keys => {
      const paths = keys.map(req => {
        return new URL(req.url).pathname;
      });

      const changed = assets.additional.filter((path) => {
        return paths.indexOf(path) === -1;
      });

      if (!changed.length) return;

      console.group('[SW]:', 'Caching changed assets');
      changed.map((path) => {
        console.log('Asset:', path);
        return new Request(path);
      }).map((req) => {
        return fetch(req).then((res) => {
          return cache.put(req, res);
        });
      });
      console.groupEnd();
    })
  }

  function deleteObsolete() {
    return caches.keys().then((names) => {
      return Promise.all(names.map((name) => {
        if (name === CACHE_NAME || name.indexOf(CACHE_PREFIX) !== 0) return;
        console.log('[SW]:', 'Delete cache:', name);
        return caches.delete(name);
      }));
    });
  }

  function deleteChanged() {
    let cache;

    return caches.open(CACHE_NAME).then((_cache) => {
      cache = _cache;
      return _cache.keys();
    }).then((keys) => {
      let deletion = keys.filter((req) => {
        const url = new URL(req.url);

        if (allAssets.indexOf(url.pathname) === -1) {
          req._pathname = url.pathname;
        }
      });

      if (!deletion.length) return;

      console.group('[SW]:', 'Deleting changed assets');
      deletion = deletion.map((req) => {
        console.log('Asset:', req._pathname);
        return cache.delete(req);
      });
      console.groupEnd();

      return Promise.all(deletion);
    });
  }

  self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Match only same origin and known caches
    // otherwise just perform fetch()
    if (
      event.request.method !== 'GET' ||
      url.origin !== location.origin ||
      allAssets.indexOf(url.pathname) === -1
    ) {
      if (DEBUG) {
        console.log('[SW]:', 'Path [' + url.pathname + '] does not match any assets');
      }

      // Fix for https://twitter.com/wanderview/status/696819243262873600
      if (navigator.userAgent.indexOf('Firefox/44') !== -1) {
        event.respondWith(fetch(event.request));
      }

      return;
    }

    // if asset is from main entry read it directly from the cache
    if (assets.main.indexOf(url.pathname) !== -1) {
      event.respondWith(
        caches.match(event.request, {
          cacheName: CACHE_NAME
        }, {
          ignoreSearch: true
        })
      );

      return;
    }

    const resource = caches.match(event.request, {
      cacheName: CACHE_NAME
    }, {
      // Externals should be matched without ignoreSearch
      ignoreSearch: true
    }).then((response) => {
      if (response) {
        if (DEBUG) {
          console.log('[SW]:', 'Path [' + url.pathname + '] from cache');
        }

        return response;
      }

      // Load and cache known assets
      return fetch(event.request.clone()).then((response) => {
        if (
          !response || response.status !== 200 || response.type !== 'basic'
        ) {
          if (DEBUG) {
            console.log('[SW]:', 'Path [' + url.pathname + '] wrong response');
          }

          return response;
        }

        if (DEBUG) {
          console.log('[SW]:', 'Path [' + url.pathname + '] fetched');
        }

        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          return cache.put(event.request, responseClone);
        }).then(() => {
          console.log('[SW]:', 'Cache asset: ' + url.pathname);
        });

        return response;
      });
    });

    event.respondWith(resource);
  });

  function mapAssets() {
    Object.keys(assets).forEach((key) => {
      assets[key] = assets[key].map((path) => {
        const pathURL = new URL(scopeURL.origin + scopeURL.pathname + path);
        return pathURL.pathname;
      });
    });
  }

  function applyCacheBust(asset, key) {
    const hasQuery = asset.indexOf('?') !== -1;
    return asset + (hasQuery ? '&' : '?') + '__uncache=' + key;
  }
}
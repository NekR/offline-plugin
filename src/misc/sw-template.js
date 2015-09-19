function WebpackServiceWorker(params) {
  const strategy = params.strategy;
  const assets = params.assets;
  const tagMap = {
    all: params.version,
    changed: 'static',
    hash: params.hash
  };

  const CACHE_PREFIX = params.name;
  const CACHE_TAG = tagMap[strategy];
  const CACHE_NAME = CACHE_PREFIX + ':' + CACHE_TAG;

  const allAssets = [].concat(assets.main, assets.additional, assets.optional);

  self.addEventListener('install', (event) => {
    console.log('[SW]:', 'Install event');

    event.waitUntil(
      cacheAssets('main')
    );
  });

  self.addEventListener('activate', (event) => {
    console.log('[SW]:', 'Activate event');

    let caching;
    let deletion = deleteObsolete();

    if (assets.additional.length) {
      caching = strategy === 'changed' ?
        updateChanged() : cacheAssets('additional');
    } else {
      caching = Promise.resolve();
    }

    if (strategy === 'changed') {
      deletion = deletion;
    }

    event.waitUntil(Promise.all([caching, deletion]).then(() => {
      if (self.skipWaiting) self.skipWaiting();
    }));
  });

  function cacheAssets(section) {
    return caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets[section]).then(() => {
        console.groupCollapsed('[SW]:', 'Cached assets: ' + section);
        assets[section].forEach((asset) => {
          console.log('Asset:', asset);
        });
        console.groupEnd();
      });
    });
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

  function updateChanged() {
    let cache;

    return caches.open(CACHE_NAME).then((_cache) => {
      cache = _cache;
      return _cache.keys();
    }).then((keys) => {
      const diff = assets.additional.concat();
      const deletion = keys.map((req) => {
        const url = new URL(req.url);

        if (allAssets.indexOf(url.pathname) === -1) {
          return cache.delete(req);
        }

        const index = diff.indexOf(url.pathname);

        if (index !== -1) {
          diff.splice(index, 1);
        }
      });

      const caching = cache.addAll(diff);

      return Promise.all([
        Promise.all(deletion),
        caching
      ]);
    });
  }

  self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (
      url.origin !== location.origin ||
      allAssets.indexOf(url.pathname) === -1
    ) {
      if (DEBUG) {
        console.log('Path [' + url.pathname + '] does not match any assets');
      }

      return event.respondWith(
        fetch(event.request)
      );
    }

    const resource = caches.match(event.request).then((response) => {
      if (response) {
        if (DEBUG) {
          console.log('Path [' + url.pathname + '] from cache');
        }

        return response;
      }

      return fetch(event.request.clone()).then((response) => {
        if (
          !response || response.status !== 200 || response.type !== 'basic'
        ) {
          if (DEBUG) {
            console.log('Path [' + url.pathname + '] wrong response');
          }

          return response;
        }

        if (DEBUG) {
          console.log('Path [' + url.pathname + '] fetched');
        }

        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          return cache.put(event.request, responseClone);
        }).then(() => {
          if (DEBUG) {
            console.log('Path [' + url.pathname + '] cached');
          }
        });

        return response;
      });
    })

    event.respondWith(resource);
  });
}
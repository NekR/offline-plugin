function WebpackServiceWorker(params) {
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
    // Delete all assets which start with CACHE_PREFIX and
    // is not current cache (CACHE_NAME)
    let deletion = deleteObsolete();

    if (assets.additional.length) {
      caching = strategy === 'changed' ?
        // Update current (static) cache, remove all files
        // (old hash/version in file names) and add new files
        updateChanged() :
        // or load additional section to current
        // (dynamic via hash/version) cache
        cacheAssets('additional');
    } else {
      caching = Promise.resolve();
    }

    event.waitUntil(Promise.all([caching, deletion]).then(() => {
      // Skip waiting other clients only when all mandatory cache is loaded
      // (allows new clients to use this worker immediately)
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

      const caching = diff.map((path) => {
        return new Request(path);
      }).map((req) => {
        return fetch(req).then((res) => {
          return cache.put(req, res);
        }, () => {});
      });

      return Promise.all([
        Promise.all(deletion),
        Promise.all(caching)
      ]);
    });
  }

  self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Match only same origin and known caches
    // otherwise just perform fetch()
    if (
      url.origin !== location.origin ||
      allAssets.indexOf(url.pathname) === -1
    ) {
      if (DEBUG) {
        console.log('Path [' + url.pathname + '] does not match any assets');
      }

      // Will other 'fetch' events receive control now since I skipped
      // this handling?
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

      // Load and cache known assets
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
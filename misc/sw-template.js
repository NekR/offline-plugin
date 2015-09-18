require('./cache-polyfill');

var CACHE_NAME = 'webpack-offline';

var mainCache = [
  %main_cache%
];

var additionalCache = [
  %additional_cache%
];

var optionalCache = [
  %optional_cache%
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(mainCache);
    })
  );
});

self.addEventListener('activate', function(event) {
  var update = caches.open(CACHE_NAME).then(function(cache) {
    return cache.keys().map(function(key) {
      if (mainCache.indexOf(key) !== -1) return;

      return cache.delete(key);
    }).then(function() {
      return cache;
    });
  }).then(function(cache) {
    return cache.addAll(additionalCache);
  });

  event.waitUntil(update);
});

optionalCache.length && self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  if (
    url.origin !== location.origin ||
    optionalCache.indexOf(url.pathname) === -1
  ) {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );

    return;
  }

  var resource = caches.match(event.request).then(function(response) {
    if (response) {
      return response;
    }

    return fetch(event.request.clone()).then(function(response) {
      if (
        !response || response.status !== 200 ||
        response.type !== 'basic'
      ) {
        return response;
      }

      var responseClone = response.clone();

      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, responseClone);
      });

      return response;
    });
  })

  event.respondWith(resource);
});
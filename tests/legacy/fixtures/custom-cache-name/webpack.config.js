module.exports = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },

  ServiceWorker: {
    cacheName: 'custom-cache-name'
  },

  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]'
});
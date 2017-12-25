module.exports = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },

  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]',

  ServiceWorker: {
    navigateFallbackURL: '/',
    navigateFallbackForRedirects: true
  }
});
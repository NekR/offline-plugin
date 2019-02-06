module.exports = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },

  ServiceWorker: false,

  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]'
});
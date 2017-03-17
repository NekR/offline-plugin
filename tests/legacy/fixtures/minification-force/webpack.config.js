var config = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },
  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]',
  ServiceWorker: {
    minify: true
  }
});

config.plugins[0].__tests.swMetadataOnly = false;
module.exports = config;
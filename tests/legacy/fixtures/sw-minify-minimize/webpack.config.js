var webpackVersion = parseInt(require('webpack/package.json').version);

var config = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },
  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]',
}, {
  swMetadataOnly: false
});

if (webpackVersion >= 4) {
  config.optimization = { minimize: true };
}

module.exports = config;
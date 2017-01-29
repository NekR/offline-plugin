var config = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },

  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]',
  autoUpdate: true,
  autoUpdateInterval: 5000
});

module.exports = config;

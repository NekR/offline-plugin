var config = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },

  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]'
});


config.plugins[0].__tests = {};
module.exports = config;
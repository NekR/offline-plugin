module.exports = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },

  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]',

  publicPath: '/path/',
  appShell: '/app-shell.html'
}, {
  swMetadataOnly: false
});
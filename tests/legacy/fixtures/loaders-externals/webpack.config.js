module.exports = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:', ':externals:']
  },

  externals: [
    'external.js',
    'fonts-css:https://fonts.googleapis.com/css?family=Montserrat:400,700'
  ],
  excludes: ['main.js'],
  version: '[hash]',
}, {
  swMetadataOnly: false
});
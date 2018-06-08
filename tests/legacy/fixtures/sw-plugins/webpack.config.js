const { DefinePlugin } = require('webpack');

module.exports = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },

  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]',

  ServiceWorker: {
    entry: 'sw-entry.js',
    plugins: [new DefinePlugin({ CAT: '\'MEOW\'' })],
  }
}, {
  swMetadataOnly: false
});

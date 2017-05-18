var UglifyJsPlugin = require('webpack').optimize.UglifyJsPlugin;
var config = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },
  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]',
  ServiceWorker: {
    minify: false
  }
});

config.plugins[0].__tests.swMetadataOnly = false;
config.plugins.push(new UglifyJsPlugin({
  compress: {
    warnings: false,
    dead_code: true,
    drop_console: true,
    unused: true
  },

  output: {
    comments: false
  }
}));
module.exports = config;
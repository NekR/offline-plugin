var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
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
  uglifyOptions: {
    compress: {
      warnings: false,
      dead_code: true,
      drop_console: true,
      unused: true
    },

    output: {
      comments: false
    }
  }
}));
module.exports = config;
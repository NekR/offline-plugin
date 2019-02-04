var UglifyJsPlugin = require(__ROOT__ + '/lib/misc/get-uglify-plugin');

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
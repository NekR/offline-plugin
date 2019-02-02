var makeUglifyJsPlugin = require(__ROOT__ + '/lib/misc/get-uglify-plugin').makeUglifyJsPlugin;

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

config.plugins.push(makeUglifyJsPlugin({
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
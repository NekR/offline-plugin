var makeMinificationPlugin = require(__ROOT__ + '/lib/misc/get-minification-plugin').makeMinificationPlugin;

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
}, {
  swMetadataOnly: false
});

config.plugins.push(makeMinificationPlugin({
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
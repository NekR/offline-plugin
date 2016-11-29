var path = require('path');
var config = __CONFIG__({
  externals: [
    '/images/bgz.jpg',
    '/images/hamburger.svg',
    '/images/logo_grey.svg',
  ],
  ServiceWorker: {
    output: '../sw.js',
    publicPath: '/override/sw.js'
  },
  AppCache: {
    output: '../appcache',
    publicPath: '/override/appcache'
  },
  version: '[hash]',
  publicPath: '/dist/'
});

config.output.path = path.join(config.output.path, 'dist');

module.exports = config;
var path = require('path');
var config = __CONFIG__({
  externals: [
    '/images/bgz.jpg',
    '/images/hamburger.svg',
    '/images/logo_grey.svg',
  ],
  ServiceWorker: {
    output: 'offline/sw.js'
  },
  AppCache: {
    output: 'offline/appcache'
  },
  version: '[hash]',
  relativePaths: true
});

config.output.publicPath = '/dist/';
module.exports = config;
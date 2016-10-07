var path = require('path');
var config = require('../config')({
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
  version: '[hash]'
});

config.output.publicPath = '/dist/';
module.exports = config;
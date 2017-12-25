'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _miscUtils = require('./misc/utils');

exports['default'] = {
  caches: 'all',
  publicPath: void 0,
  updateStrategy: 'changed',
  responseStrategy: 'cache-first',
  externals: [],
  excludes: ['**/.*', '**/*.map', '**/*.gz'],
  // Hack to have intermediate value, e.g. default one, true and false
  relativePaths: ':relativePaths:',
  version: null,
  autoUpdate: false,
  cacheMaps: null,
  appShell: null,

  rewrites: function rewrites(asset) {
    return asset.replace(/^([\s\S]*?)index.htm(l?)$/, function (match, dir) {
      if ((0, _miscUtils.isAbsoluteURL)(match)) {
        return match;
      }

      return dir || './';
    });
  },

  ServiceWorker: {
    output: 'sw.js',
    entry: _path2['default'].join(__dirname, '../tpls/empty-entry.js'),
    scope: null,
    events: false,
    minify: null,

    prefetchRequest: {
      credentials: 'omit',
      headers: void 0,
      mode: 'cors',
      cache: void 0
    },

    navigationPreload: ':auto:',

    // Deprecated features
    navigateFallbackURL: void 0,
    navigateFallbackForRedirects: true
  },

  AppCache: {
    NETWORK: '*',
    FALLBACK: null,
    directory: 'appcache/',
    caches: ['main'],
    events: false,
    disableInstall: false,
    includeCrossOrigin: false
  },

  // Needed for testing
  __tests: {
    swMetadataOnly: false,
    ignoreRuntime: false,
    noVersionDump: false
  }
};
module.exports = exports['default'];
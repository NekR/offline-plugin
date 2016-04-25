'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _es6Promise = require('es6-promise');

var _miscUtils = require('./misc/utils');

var AppCache = (function () {
  function AppCache(options) {
    _classCallCheck(this, AppCache);

    this.NETWORK = options.NETWORK;
    this.FALLBACK = options.FALLBACK;
    this.name = 'manifest';
    this.caches = options.caches;

    this.directory = options.directory.replace(/^\//, '').replace(/\/$/, '') + '/';
    this.basePath = (0, _miscUtils.pathToBase)(this.directory, true);
  }

  _createClass(AppCache, [{
    key: 'addEntry',
    value: function addEntry(plugin, compilation, compiler) {
      // no-op
      return _es6Promise.Promise.resolve();
    }
  }, {
    key: 'apply',
    value: function apply(plugin, compilation, compiler) {
      var _this = this;

      if (!Array.isArray(this.caches)) {
        throw new Error('AppCache caches must be an array');
      }

      var cache = (this.caches.reduce(function (result, name) {
        var cache = plugin.caches[name];
        if (!cache || !cache.length) return result;

        if (result) {
          result = result.concat(cache);
        } else {
          result = cache;
        }

        return result;
      }, null) || []).map(plugin.relativePaths ? function (path) {
        return _this.basePath + path;
      } : function (a) {
        return a;
      });

      var path = this.directory + this.name;
      var manifest = this.getManifestTemplate(cache, plugin);
      var page = this.getPageTemplate(this.name);

      compilation.assets[path + '.appcache'] = (0, _miscUtils.getSource)(manifest);
      compilation.assets[path + '.html'] = (0, _miscUtils.getSource)(page);
    }
  }, {
    key: 'getManifestTemplate',
    value: function getManifestTemplate(cache, plugin) {
      var _this2 = this;

      var tag = 'ver:' + plugin.version;

      var FALLBACK = '';
      var NETWORK = '';

      if (this.NETWORK) {
        NETWORK = 'NETWORK:\n' + (Array.isArray(this.NETWORK) ? this.NETWORK.join('\n') : this.NETWORK + '');
      }

      if (this.FALLBACK) {
        FALLBACK = 'FALLBACK:\n' + Object.keys(this.FALLBACK).map(function (path) {
          return path + ' ' + _this2.FALLBACK[path];
        }).join('\n');
      }

      return ('\n      CACHE MANIFEST\n      #' + tag + '\n\n      CACHE:\n      ' + cache.join('\n') + '\n\n      ' + NETWORK + '\n\n      ' + FALLBACK + '\n    ').trim().replace(/^      */gm, '');
    }
  }, {
    key: 'getPageTemplate',
    value: function getPageTemplate(name, content) {
      return ('\n      <!doctype html>\n      <html manifest="' + name + '.appcache">' + (content || '') + '</html>\n    ').trim().replace(/^      */gm, '');
    }
  }, {
    key: 'getConfig',
    value: function getConfig(plugin) {
      return {
        directory: plugin.publicPath + this.directory,
        name: this.name
      };
    }
  }]);

  return AppCache;
})();

exports['default'] = AppCache;
module.exports = exports['default'];
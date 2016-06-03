'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _es6Promise = require('es6-promise');

var _miscUtils = require('./misc/utils');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var AppCache = (function () {
  function AppCache(options) {
    _classCallCheck(this, AppCache);

    this.NETWORK = options.NETWORK;
    this.FALLBACK = options.FALLBACK;
    this.name = 'manifest';
    this.caches = options.caches;
    this.events = !!options.events;

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
      if (!Array.isArray(this.caches)) {
        throw new Error('AppCache caches must be an array');
      }

      var pathRewrite = this.pathRewrite(plugin);
      var cache = (this.caches.reduce(function (result, name) {
        var cache = plugin.caches[name];
        if (!cache || !cache.length) return result;

        if (result) {
          result = result.concat(cache);
        } else {
          result = cache;
        }

        return result;
      }, null) || []).map(pathRewrite);

      var path = this.directory + this.name;
      var manifest = this.getManifestTemplate(cache, plugin);
      var content = this.getPageContent();
      var page = this.getPageTemplate(this.name, content);

      compilation.assets[path + '.appcache'] = (0, _miscUtils.getSource)(manifest);
      compilation.assets[path + '.html'] = (0, _miscUtils.getSource)(page);
    }
  }, {
    key: 'getManifestTemplate',
    value: function getManifestTemplate(cache, plugin) {
      var _this = this;

      var tag = 'ver:' + plugin.version;

      var FALLBACK = '';
      var NETWORK = '';

      if (this.NETWORK) {
        NETWORK = 'NETWORK:\n' + (Array.isArray(this.NETWORK) ? this.NETWORK.join('\n') : this.NETWORK + '');
      }

      if (this.FALLBACK) {
        FALLBACK = 'FALLBACK:\n' + Object.keys(this.FALLBACK).map(function (path) {
          return path + ' ' + _this.FALLBACK[path];
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
    key: 'getPageContent',
    value: function getPageContent() {
      if (this.events) {
        return _fs2['default'].readFileSync(_path2['default'].join(__dirname, '../tpls/appcache-frame.tpl'), 'utf-8');
      } else {
        return '';
      }
    }
  }, {
    key: 'pathRewrite',
    value: function pathRewrite(plugin) {
      var _this2 = this;

      if (plugin.relativePaths) {
        return function (path) {
          return (0, _miscUtils.isAbsoluteURL)(path) ? path : _this2.basePath + path;
        };
      }

      return function (path) {
        return path;
      };
    }
  }, {
    key: 'getConfig',
    value: function getConfig(plugin) {
      return {
        directory: plugin.publicPath + this.directory,
        name: this.name,
        events: this.events
      };
    }
  }]);

  return AppCache;
})();

exports['default'] = AppCache;
module.exports = exports['default'];
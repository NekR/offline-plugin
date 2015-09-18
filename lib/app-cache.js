'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _miscGetSource = require('../misc/get-source');

var _miscGetSource2 = _interopRequireDefault(_miscGetSource);

var AppCache = (function () {
  function AppCache(options) {
    _classCallCheck(this, AppCache);

    this.NETWORK = options.NETWORK;
    this.directory = options.directory.replace(/\/$/, '/');
  }

  _createClass(AppCache, [{
    key: 'addEntry',
    value: function addEntry(plugin, compilation, compiler) {
      // no-op
      return Promise.resolve();
    }
  }, {
    key: 'apply',
    value: function apply(plugin, compilation, compiler) {
      var _this = this;

      ['main', 'additional'].forEach(function (name) {
        var cache = plugin.caches[name];
        if (!Array.isArray(cache) || !cache.length) return;

        var manifest = _this.getManifestTemplate(cache, plugin);
        var page = _this.getPageTemplate(name, plugin);

        var path = _this.directory + name;

        compilation.assets[path + '.appcache'] = (0, _miscGetSource2['default'])(manifest);
        compilation.assets[path + '.html'] = (0, _miscGetSource2['default'])(page);
      });
    }
  }, {
    key: 'getManifestTemplate',
    value: function getManifestTemplate(cache, plugin) {
      var tag = undefined;

      if (plugin.strategy === 'all') {
        tag = 'ver:' + plugin.version;
      }

      if (plugin.strategy === 'changed') {
        tag = ':static';
      }

      if (plugin.strategy === 'hash') {
        tag = 'hash:' + plugin.hash;
      }

      return ('\n      CACHE MANIFEST\n      #' + tag + '\n\n      CACHE:\n      ' + cache.join('\n') + '\n\n      NETWORK:\n      ' + (this.NETWORK + '') + '\n    ').trim().replace(/^      */gm, '');
    }
  }, {
    key: 'getPageTemplate',
    value: function getPageTemplate(name) {
      return '\n      <!doctype html>\n      <html manifest="' + name + '.appcache">\n        <script>\n          (function() {\n            var called = false;\n\n            [\n              \'cached\',\n              \'noupdate\',\n              \'obsolete\',\n              \'updateready\',\n              // \'error\',\n            ].forEach(function(event) {\n              applicationCache.addEventListener(event, function() {\n                if (called) return;\n                called = true;\n\n                \n              }, false);\n            });\n          }());\n        </script>\n      </html>\n    ';
    }
  }, {
    key: 'getConfig',
    value: function getConfig(plugin) {
      return {
        directory: plugin.scope + this.directory
      };
    }
  }]);

  return AppCache;
})();

exports['default'] = AppCache;
module.exports = exports['default'];
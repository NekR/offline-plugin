'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _webpackLibDependenciesSingleEntryDependency = require('webpack/lib/dependencies/SingleEntryDependency');

var _webpackLibDependenciesSingleEntryDependency2 = _interopRequireDefault(_webpackLibDependenciesSingleEntryDependency);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var cachePolyfill = _fs2['default'].readFileSync(_path2['default'].join(__dirname, '../misc/cache-polyfill.js'));

var ServiceWorker = (function () {
  function ServiceWorker(options) {
    _classCallCheck(this, ServiceWorker);

    this.output = options.output;
    this.entry = options.entry;
    this.entryName = 'serviceworker';
    this.scope = options.scope;
  }

  _createClass(ServiceWorker, [{
    key: 'addEntry',
    value: function addEntry(plugin, compilation, compiler) {
      if (!this.entry) return Promise.resolve();

      var name = plugin.entryPrefix + this.entryName;
      var dep = new _webpackLibDependenciesSingleEntryDependency2['default'](this.entry);
      dep.loc = name;

      return new Promise(function (resolve) {
        compilation.addEntry(compiler.context, dep, name, function () {
          resolve();
        });
      });
    }
  }, {
    key: 'apply',
    value: function apply(plugin, compilation, compiler) {
      var _source = this.getTemplate(plugin.caches);

      if (this.entry) {
        var _name = plugin.entryPrefix + this.entryName;
        var entry = compilation.assets[_name];

        if (!entry) {
          _name = _name + '.js';
          entry = compilation.assets[_name];
        }

        if (!entry) {
          throw new Error('Something went wrong with ServiceWorker entry');
        }

        entry = entry.source();
        delete compilation.assets[_name];

        _source += '\n\n' + entry;
      }

      compilation.assets[this.output] = {
        source: function source() {
          return _source;
        },
        size: function size() {
          return Buffer.byteLength(_source, 'utf8');
        }
      };
    }
  }, {
    key: 'getTemplate',
    value: function getTemplate(data) {
      var cache = function cache(key) {
        return (data[key] || []).map(function (asset) {
          return JSON.stringify(asset);
        }).join(',\n');
      };

      return ('\n      polyfill();\n\n      var CACHE_NAME = \'webpack-offline\';\n      var CACHE_VERSION = ' + 0 + ';\n\n      var mainCache = [\n        ' + cache('main') + '\n      ];\n\n      var additionalCache = [\n        ' + cache('additional') + '\n      ];\n\n      var optionalCache = [\n        ' + cache('optional') + '\n      ];\n\n      self.addEventListener(\'install\', function(event) {\n        event.waitUntil(\n          caches.open(CACHE_NAME).then(function(cache) {\n            return cache.addAll(mainCache);\n          })\n        );\n      });\n\n      self.addEventListener(\'activate\', function(event) {\n        var cache;\n        var update = caches.open(CACHE_NAME).then(function(c) {\n          cache = c;\n          return cache.keys()\n        }).then(function(keys) {\n          return Promise.all(keys.map(function(request) {\n            var url = new URL(request.url);\n            if (mainCache.indexOf(url.pathname) !== -1) return;\n\n            console.log(\'delete:\', url.href);\n            return cache.delete(request);\n          }))\n        }).then(function() {\n          return cache.addAll(additionalCache);\n        });\n\n        event.waitUntil(update);\n      });\n\n      self.addEventListener(\'fetch\', function(event) {\n        var url = new URL(event.request.url);\n\n        if (\n          url.origin !== location.origin ||\n          optionalCache.indexOf(url.pathname) === -1\n        ) {\n          event.respondWith(\n            caches.match(event.request).then(function(response) {\n              return response || fetch(event.request);\n            })\n          );\n\n          return;\n        }\n\n        var resource = caches.match(event.request).then(function(response) {\n          if (response) {\n            return response;\n          }\n\n          return fetch(event.request.clone()).then(function(response) {\n            if (\n              !response || response.status !== 200 ||\n              response.type !== \'basic\'\n            ) {\n              return response;\n            }\n\n            var responseClone = response.clone();\n\n            caches.open(CACHE_NAME).then(function(cache) {\n              cache.put(event.request, responseClone);\n            });\n\n            return response;\n          });\n        })\n\n        event.respondWith(resource);\n      });\n\n      function polyfill() {\n        ' + cachePolyfill + '\n      }\n    ').trim().replace(/^      /gm, '');;
    }
  }, {
    key: 'getConfig',
    value: function getConfig(plugin) {
      return {
        output: plugin.options.scope + this.output
      };
    }
  }]);

  return ServiceWorker;
})();

exports['default'] = ServiceWorker;
module.exports = exports['default'];
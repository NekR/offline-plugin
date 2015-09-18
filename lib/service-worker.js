'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _webpackLibDependenciesSingleEntryDependency = require('webpack/lib/dependencies/SingleEntryDependency');

var _webpackLibDependenciesSingleEntryDependency2 = _interopRequireDefault(_webpackLibDependenciesSingleEntryDependency);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _miscGetSource = require('../misc/get-source');

var _miscGetSource2 = _interopRequireDefault(_miscGetSource);

var ServiceWorker = (function () {
  function ServiceWorker(options) {
    _classCallCheck(this, ServiceWorker);

    this.output = options.output;
    this.entry = options.entry;

    this.ENTRY_NAME = 'serviceworker';
    this.CACHE_NAME = 'webpack-offline';
    this.SW_DATA_VAR = '__wpo';
  }

  _createClass(ServiceWorker, [{
    key: 'addEntry',
    value: function addEntry(plugin, compilation, compiler) {
      if (!this.entry) return Promise.resolve();

      var data = JSON.stringify({
        data_var_name: this.SW_DATA_VAR
      });
      var loader = _path2['default'].join(__dirname, '../misc/sw-loader.js') + '?' + data;
      var name = plugin.entryPrefix + this.ENTRY_NAME;
      var dep = new _webpackLibDependenciesSingleEntryDependency2['default'](loader + '!' + this.entry);
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
      var minify = (compiler.options.plugins || []).some(function (plugin) {
        return plugin instanceof _webpack2['default'].optimize.UglifyJsPlugin;
      });

      var source = this.getDataTemplate(plugin.caches, plugin, minify);

      if (this.entry) {
        var _name = plugin.entryPrefix + this.ENTRY_NAME;
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

        source += '\n\n' + entry;
      }

      compilation.assets[this.output] = (0, _miscGetSource2['default'])(source);
    }
  }, {
    key: 'getDataTemplate',
    value: function getDataTemplate(data, plugin, minify) {
      var cache = function cache(key) {
        return data[key] || [];
      };

      return ('\n      var ' + this.SW_DATA_VAR + ' = ' + JSON.stringify({
        assets: {
          main: cache('main'),
          additional: cache('additional'),
          optional: cache('optional')
        },
        version: plugin.version,
        name: this.CACHE_NAME
      }, null, minify ? void 0 : '  ') + ';\n    ').trim();
    }
  }, {
    key: 'getConfig',
    value: function getConfig(plugin) {
      return {
        output: plugin.scope + this.output
      };
    }
  }]);

  return ServiceWorker;
})();

exports['default'] = ServiceWorker;
module.exports = exports['default'];
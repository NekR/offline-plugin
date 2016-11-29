'use strict';

var path = require('path');
var fs = require('fs');
var loaderUtils = require('loader-utils');

module.exports = function () {};
module.exports.pitch = function pitch(remainingRequest, precedingRequest, data) {
  var _this = this;

  this.cacheable && this.cacheable();

  var callback = this.async();
  var templatePath = path.join(__dirname, 'sw-template.js');
  var query = loaderUtils.parseQuery(this.query);
  var params = JSON.parse(query.json);

  var request = loaderUtils.stringifyRequest(this, remainingRequest);
  var source = 'module.exports = require(' + request + ')';

  var loaders = (params.loaders || []).map(function (loader) {
    var loaderPath = path.join(__dirname, '../loaders', loader + '.js');
    var loaderRequest = loaderUtils.stringifyRequest(_this, '!!' + loaderPath);

    _this.addDependency(loaderPath);

    return JSON.stringify(loader) + ': require(' + loaderRequest + ')';
  });

  var cacheMaps = (params.cacheMaps || []).map(function (map) {
    return '{\n      match: ' + map.match + ',\n      to: ' + map.to + ',\n      requestTypes: ' + JSON.stringify(map.requestTypes) + ',\n    }';
  });

  this.addDependency(templatePath);

  var loadersCode = '{}';

  if (loaders.length) {
    loadersCode = '{\n      ' + loaders.join(',\n') + '\n    }';
  }

  var cacheMapsCode = '[]';

  if (cacheMaps.length) {
    cacheMapsCode = '[\n      ' + cacheMaps.join(',\n') + '\n    ]';
  }

  var helpersCode = [', {', 'loaders: ' + loadersCode + ',', 'cacheMaps: ' + cacheMapsCode + ',', '}'];

  fs.readFile(templatePath, 'utf-8', function (err, template) {
    if (err) return callback(err);

    template = '\n      ' + template + '\n      WebpackServiceWorker(' + params.data_var_name + helpersCode.join('\n') + ');\n      ' + source + '\n    ';

    callback(null, template);
  });
};
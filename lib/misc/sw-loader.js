'use strict';

var path = require('path');
var fs = require('fs');
var loaderUtils = require('loader-utils');

module.exports = function () {};
module.exports.pitch = function (remainingRequest, precedingRequest, data) {
  this.cacheable && this.cacheable();

  var callback = this.async();
  var templatePath = path.join(__dirname, 'sw-template.js');
  var params = JSON.parse(this.query.slice(1));

  var request = loaderUtils.stringifyRequest(this, remainingRequest);
  var source = 'module.exports = require(' + request + ')';

  var polyfillRequest = loaderUtils.stringifyRequest(this, '!!' + path.join(__dirname, 'sw-polyfill.js'));
  var polyfill = 'require(' + polyfillRequest + ')';

  this.addDependency(templatePath);

  fs.readFile(templatePath, 'utf-8', function (err, template) {
    if (err) return callback(err);

    template = '\n      ' + template + '\n      ' + polyfill + '\n      WebpackServiceWorker(' + params.data_var_name + ');\n      ' + source + '\n    ';

    callback(null, template);
  });
};
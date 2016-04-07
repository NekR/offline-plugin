const path = require('path');
const fs = require('fs');
const loaderUtils = require('loader-utils');

module.exports = function() {};
module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  this.cacheable && this.cacheable();

  const callback = this.async();
  const templatePath = path.join(__dirname, 'sw-template.js');
  const params = JSON.parse(this.query.slice(1));

  const request = loaderUtils.stringifyRequest(this, remainingRequest);
  const source = 'module.exports = require(' + request + ')';

  const polyfillRequest = loaderUtils.stringifyRequest(this, '!!' + path.join(__dirname, 'sw-polyfill.js'));
  const polyfill = 'require(' + polyfillRequest + ')';

  this.addDependency(templatePath);

  fs.readFile(templatePath, 'utf-8', function(err, template) {
    if (err) return callback(err);

    template = `
      ${ template }
      ${ polyfill }
      WebpackServiceWorker(${ params.data_var_name });
      ${ source }
    `;

    callback(null, template);
  });
};
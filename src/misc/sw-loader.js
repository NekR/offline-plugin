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

  const loaders = (params.loaders || []).map((loader) => {
    const loaderPath = path.join(__dirname, '../loaders', loader + '.js');
    const loaderRequest = loaderUtils.stringifyRequest(this, '!!' + loaderPath);

    this.addDependency(loaderPath);

    return `${ JSON.stringify(loader) }: require(${ loaderRequest })`;
  });

  this.addDependency(templatePath);

  let loadersCode = '';

  if (loaders.length) {
    loadersCode = `, {
      ${ loaders.join(',\n') }
    }`
  }

  fs.readFile(templatePath, 'utf-8', function(err, template) {
    if (err) return callback(err);

    template = `
      ${ template }
      WebpackServiceWorker(${ params.data_var_name }${ loadersCode });
      ${ source }
    `;

    callback(null, template);
  });
};
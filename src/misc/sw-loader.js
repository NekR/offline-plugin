const path = require('path');
const fs = require('fs');
const loaderUtils = require('loader-utils');

module.exports = function() {};
module.exports.pitch = function pitch(remainingRequest, precedingRequest, data) {
  this.cacheable && this.cacheable();

  const callback = this.async();
  const templatePath = path.join(__dirname, 'sw-template.js');
  const query = loaderUtils.parseQuery(this.query);
  const params = JSON.parse(query.json);

  const request = loaderUtils.stringifyRequest(this, remainingRequest);
  const source = 'module.exports = require(' + request + ')';

  const loaders = (params.loaders || []).map((loader) => {
    const loaderPath = path.join(__dirname, '../loaders', loader + '.js');
    const loaderRequest = loaderUtils.stringifyRequest(this, '!!' + loaderPath);

    this.addDependency(loaderPath);

    return `${ JSON.stringify(loader) }: require(${ loaderRequest })`;
  });

  const cacheMaps = (params.cacheMaps || []).map((map) => {
    return `{
      match: ${map.match},
      to: ${map.to},
      requestTypes: ${JSON.stringify(map.requestTypes)},
    }`;
  });

  this.addDependency(templatePath);

  let loadersCode = '{}';

  if (loaders.length) {
    loadersCode = `{
      ${loaders.join(',\n')}
    }`;
  }

  let cacheMapsCode = '[]';

  if (cacheMaps.length) {
    cacheMapsCode = `[
      ${cacheMaps.join(',\n')}
    ]`;
  }

  const helpersCode = [
    ', {',
      `loaders: ${loadersCode},`,
      `cacheMaps: ${cacheMapsCode},`,
    '}',
  ];

  fs.readFile(templatePath, 'utf-8', function(err, template) {
    if (err) return callback(err);

    template = `
      ${ template }
      WebpackServiceWorker(${ params.data_var_name }${ helpersCode.join('\n') });
      ${ source }
    `;

    callback(null, template);
  });
};
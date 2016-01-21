const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

module.exports = function() {};
module.exports.pitch = function(remainingRequest, precedingRequest, data) {
  this.cacheable && this.cacheable();

  const callback = this.async();
  const params = JSON.parse(this.query.slice(1));
  const templatePath = path.join(__dirname, '../../tpls/runtime-template.js');

  this.addDependency(templatePath);

  fs.readFile(templatePath, 'utf-8', function(err, template) {
    if (err) return callback(err);

    template = ejs.render(template, params);
    callback(null, template);
  });
};
const ejs = require('ejs');

module.exports = function(source) {
  this.cacheable && this.cacheable();

  const context = this.options.resolve.root || this.options.context;
  const params = JSON.parse(this.query.slice(1));

  source = 'module.exports = ' + ejs.render(source, params);

  return source;
};
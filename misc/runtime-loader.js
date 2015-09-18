var ejs = require('ejs');

module.exports = function(source) {
  this.cacheable && this.cacheable();

  var context = this.options.resolve.root || this.options.context;
  var params = JSON.parse(this.query.slice(1));

  source = 'module.exports = ' + ejs.render(source, params)

  return source;
};
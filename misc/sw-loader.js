module.exports = function(source) {
  this.cacheable && this.cacheable();

  var context = this.options.resolve.root || this.options.context;
  var params = JSON.parse(this.query.slice(1));

  var data = {};

  Object.keys(params.caches).forEach(function(key) {
    data[key + '_cache'] = params.caches[key];
  });

  source = source.replace(/%([a-z_-]+?)%/gi, function(match, key) {
    return data[key] || '';
  });

  if (params.handler) {

  }

  return source;
};
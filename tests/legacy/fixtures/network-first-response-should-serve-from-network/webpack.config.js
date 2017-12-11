module.exports = __CONFIG__({
  caches: {
    main: ['external.js', ':rest:']
  },
  externals: ['external.js'],
  excludes: ['main.js'],
  version: '[hash]',
  AppCache: false,
  ServiceWorker: {
    shouldServeFromNetwork: function(response, urlString, cacheUrl) {
      if(urlString.match(/\//)) {
        return true;
      }
      return response.ok;
    }
  }
});
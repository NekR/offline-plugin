module.exports = __CONFIG__({
  externals: ['index.html'],
  excludes: ['main.js'],
  version: '[hash]',
  publicPath: '/',

  ServiceWorker: {
    navigateFallbackURL: '/'
  },

  AppCache: {
    FALLBACK: {
      '/': '/'
    }
  }
});
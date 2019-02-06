module.exports = __CONFIG__({
  excludes: ['main.js'],
  version: '[hash]',

  cacheMaps: [
    {
      match: /^https:\/\/google\.com\/([\s\S]+)$/,
      to: 'https://facebook.com/$1'
    },
    {
      match: function(url) {
        if (url.href.indexOf('https://google.com') === 0) {
          return url.href.replace('https://google.com', 'https://facebook.com');
        }
      }
    },
    {
      match: function(url) {
        if (url.origin !== location.origin) return;

        if (url.pathname.indexOf('/api/') === 0) {
          return;
        }

        return new URL('/', location);
      }
    }
  ]
}, {
  swMetadataOnly: false
});
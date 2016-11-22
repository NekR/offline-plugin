var config = __CONFIG__({
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
    }
  ]
});

config.plugins[0].__tests.swMetadataOnly = false;
module.exports = config;
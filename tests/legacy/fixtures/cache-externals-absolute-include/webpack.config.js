var config = __CONFIG__({
  caches: {
    main:[
      'main.js',
      'https://fonts.googleapis.com/css?family=Montserrat:400,700'
    ]
  },
  externals: [
    'https://fonts.googleapis.com/css?family=Montserrat:400,700'
  ],
  version: '[hash]',

  AppCache: {
    includeCrossOrigin: true
  }
});

module.exports = config;
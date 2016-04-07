var OfflinePlugin = require('../../');
var path = require('path');

module.exports = {
  entry: {
    main: 'main.js'
  },

  output: {
    path: path.join(__dirname, 'output'),
    filename: '[name].js',
  },

  plugins: [
    new OfflinePlugin()
  ],

  resolve: {
    root: path.join(__dirname),
    extensions: ['', '.js']
  }
};
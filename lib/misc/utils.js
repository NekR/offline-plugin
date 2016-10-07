'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.hasMagic = hasMagic;
exports.getSource = getSource;
exports.interpolateString = interpolateString;
exports.isAbsoluteURL = isAbsoluteURL;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _minimatch = require('minimatch');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var isAbsolutePath = _path2['default'].isAbsolute;

// Based on https://github.com/isaacs/node-glob/blob/master/glob.js#L83
// (glob.hasMagic)

function hasMagic(pattern, options) {
  var minimatch = new _minimatch.Minimatch(pattern, options);
  var set = minimatch.set;

  if (set.length > 1) {
    return minimatch;
  }

  for (var j = 0; j < set[0].length; j++) {
    if (typeof set[0][j] !== 'string') {
      return minimatch;
    }
  }

  return false;
}

function getSource(_source) {
  return {
    source: function source() {
      return _source;
    },
    size: function size() {
      return Buffer.byteLength(_source, 'utf8');
    }
  };
}

function interpolateString(string, data) {
  var hasOwnProperty = ({}).hasOwnProperty;

  return (string + '').replace(/\[(\w+?)\]/g, function (match, key) {
    if (hasOwnProperty.call(data, key)) {
      return data[key];
    }

    return '';
  });
}

function isAbsoluteURL(url) {
  return (/^(?:\w+:)?\/\//.test(url)
  );
}

exports.isAbsolutePath = isAbsolutePath;
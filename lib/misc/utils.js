'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.hasMagic = hasMagic;
exports.getSource = getSource;
exports.pathToBase = pathToBase;
exports.interpolateString = interpolateString;
exports.isAbsoluteURL = isAbsoluteURL;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _minimatch = require('minimatch');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

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

function pathToBase(relativePath, fillEmpty) {
  if (relativePath[0] === '/') {
    throw new Error('Base relative path cannot be generated from an absolute URL');
  }

  var fullPath = _path2['default'].resolve(relativePath);

  var size = _path2['default'].replace(/^\//, '').split('/').length;
  var level = new Array(size).join('../') || (fillEmpty ? './' : '');

  return level;
}

/*if (this.relativePaths) {
  return key.replace(/^\.\//, '');
}

return this.publicPath + key.replace(/^\.?\//, '');*/

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
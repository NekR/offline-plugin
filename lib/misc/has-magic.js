'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = hasMagic;

var _minimatch = require('minimatch');

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

module.exports = exports['default'];
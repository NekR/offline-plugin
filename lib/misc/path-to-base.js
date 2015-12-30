'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = pathToBase;

function pathToBase(path, fillEmpty) {
  var size = path.replace(/^\//, '').split('/').length;
  var level = new Array(size).join('../') || (fillEmpty ? './' : '');

  return level;
}

module.exports = exports['default'];
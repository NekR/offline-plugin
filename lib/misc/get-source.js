'use strict';

module.exports = function getSource(_source) {
  return {
    source: function source() {
      return _source;
    },
    size: function size() {
      return Buffer.byteLength(_source, 'utf8');
    }
  };
};
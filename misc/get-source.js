module.exports = function getSource(source) {
  return {
    source: function() {
      return source
    },
    size: function() {
      return Buffer.byteLength(source, 'utf8');
    }
  };
}
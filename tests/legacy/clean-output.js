var fs = require('fs');
var path = require('path');

module.exports = function(testDir) {
  var swPath = path.join(testDir, '__output', 'sw.js');
  var file = fs.readFileSync(swPath, 'utf-8');

  file = file.replace(/\/\*\*\*\*\*\*\/([\s\S]*)$/, '').trim();
  fs.writeFileSync(swPath, file);
};
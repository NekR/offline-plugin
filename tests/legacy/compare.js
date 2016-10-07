var dircompare = require('dir-compare');
var path = require('path');
var format = require('util').format;

var options = {
  compareContent: true,
  excludeFilter: '.DS_Store'
};

module.exports = function(testDir) {
  var res = dircompare.compareSync(
    path.join(testDir, '__expected'),
    path.join(testDir, '__output'),
    options
  );

  console.log('equal: ' + res.equal);
  console.log('distinct: ' + res.distinct);
  console.log('left: ' + res.left);
  console.log('right: ' + res.right);
  console.log('differences: ' + res.differences);
  console.log('same: ' + res.same);

  var stateType = {
    'equal' : '==',
    'left' : '->',
    'right' : '<-',
    'distinct' : '<>'
  };

  res.diffSet.forEach(function (entry) {
    var state = stateType[entry.state];
    var name1 = entry.name1 ? entry.name1 : '';
    var name2 = entry.name2 ? entry.name2 : '';

    console.log(format('%s(%s) %s %s(%s)', name1, entry.type1, state, name2, entry.type2));
  });

  if (!res.same) {
    setTimeout(function() {
      throw new Error('Test [' + testDir + '] was completed unsuccessfully');
    }, 10);
  }
}
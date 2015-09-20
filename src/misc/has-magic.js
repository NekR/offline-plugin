import { Minimatch } from 'minimatch';

// Based on https://github.com/isaacs/node-glob/blob/master/glob.js#L83
// (glob.hasMagic)
export default function hasMagic(pattern, options) {
  const minimatch = new Minimatch(pattern, options);
  const set = minimatch.set;

  if (set.length > 1) {
    return minimatch;
  }

  for (var j = 0; j < set[0].length; j++) {
    if (typeof set[0][j] !== 'string') {
      return minimatch;
    }
  }

  return false
}

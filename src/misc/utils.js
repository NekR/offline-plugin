import { Minimatch } from 'minimatch';

// Based on https://github.com/isaacs/node-glob/blob/master/glob.js#L83
// (glob.hasMagic)
export function hasMagic(pattern, options) {
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

export function getSource(source) {
  return {
    source() {
      return source
    },
    size() {
      return Buffer.byteLength(source, 'utf8');
    }
  };
}

export function pathToBase(path, fillEmpty) {
  const size = path.replace(/^\//, '').split('/').length;
  const level = new Array(size).join('../') || (fillEmpty ? './' : '');

  return level;
}

export function interpolateString(string, data) {
  const hasOwnProperty = {}.hasOwnProperty;

  return (string + '').replace(/\[(\w+?)\]/g, (match, key) => {
    if (hasOwnProperty.call(data, key)) {
      return data[key];
    }

    return ''
  });
}

export function isAbsoluteURL(url) {
  return /^(?:\w+:)\/\//.test(url);
}
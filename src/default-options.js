import path from 'path';
import { isAbsoluteURL } from './misc/utils';

export default {
  caches: 'all',
  publicPath: void 0,
  updateStrategy: 'changed',
  responseStrategy: 'cache-first',
  externals: [],
  excludes: ['**/.*', '**/*.map'],
  // Hack to have intermediate value, e.g. default one, true and false
  relativePaths: ':relativePaths:',
  version: null,
  autoUpdate: false,

  rewrites(asset) {
    return asset.replace(/^([\s\S]*?)index.htm(l?)$/, (match, dir) => {
      if (isAbsoluteURL(match)) {
        return match;
      }

      return dir || './';
    });
  },

  cacheMaps: null,

  ServiceWorker: {
    output: 'sw.js',
    entry: path.join(__dirname, '../tpls/empty-entry.js'),
    scope: null,
    events: false,
    prefetchRequest: {
      credentials: 'omit',
      headers: void 0,
      mode: 'cors',
      cache: void 0
    },
    minify: null,

    navigateFallbackURL: void 0,
    navigateFallbackForRedirects: false
  },

  AppCache: {
    NETWORK: '*',
    FALLBACK: null,
    directory: 'appcache/',
    caches: ['main'],
    events: false,
    disableInstall: false,
    includeCrossOrigin: false
  },

  // Needed for testing
  __tests: {
    swMetadataOnly: false,
    ignoreRuntime: false,
    noVersionDump: false
  },

  // Not yet used
  alwaysRevalidate: void 0,
  preferOnline: void 0,
  ignoreSearch: ['**'],
};
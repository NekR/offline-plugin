import path from 'path';
import { isAbsoluteURL } from './misc/utils';

export const DEFAULT_AUTO_UPDATE_INTERVAL = 3600000;

export const AppCacheOptions = {
  NETWORK: '*',
  FALLBACK: null,
  directory: 'appcache/',
  caches: ['main'],
  events: false,
  disableInstall: false,
  includeCrossOrigin: false
};

export default {
  caches: 'all',
  publicPath: void 0,
  updateStrategy: 'changed',
  responseStrategy: 'cache-first',
  externals: [],
  excludes: ['**/.*', '**/*.map', '**/*.gz'],
  // Hack to have intermediate value, e.g. default one, true and false
  relativePaths: ':relativePaths:',
  version: null,
  autoUpdate: false,
  cacheMaps: null,
  appShell: null,

  rewrites(asset) {
    return asset.replace(/^([\s\S]*?)index.htm(l?)$/, (match, dir) => {
      if (isAbsoluteURL(match)) {
        return match;
      }

      return dir || './';
    });
  },

  ServiceWorker: {
    output: 'sw.js',
    entry: path.join(__dirname, '../tpls/empty-entry.js'),
    scope: null,
    events: false,
    minify: null,
    forceInstall: false,

    updateViaCache: 'imports',

    prefetchRequest: {
      credentials: 'same-origin',
      headers: void 0,
      mode: 'cors',
      cache: void 0
    },

    navigationPreload: ':auto:'
  },

  // Disable AppCache by default
  AppCache: false,

  // Needed for testing
  __tests: {
    swMetadataOnly: false,
    ignoreRuntime: false,
    noVersionDump: false,
    appCacheEnabled: false
  }
};
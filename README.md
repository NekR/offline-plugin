# `offline-plugin` for webpack

[![npm](https://img.shields.io/npm/v/offline-plugin.svg?maxAge=2592000&v4)](https://www.npmjs.com/package/offline-plugin)
[![npm](https://img.shields.io/npm/dm/offline-plugin.svg?maxAge=3600)](https://www.npmjs.com/package/offline-plugin)
[![Join the chat at https://gitter.im/NekR/offline-plugin](https://badges.gitter.im/NekR/offline-plugin.svg)](https://gitter.im/NekR/offline-plugin?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

This plugin is intended to provide offline experience for **webpack** projects. It uses **ServiceWorker** and **AppCache** as a fallback under the hood. Simply include this plugin in your ``webpack.config``, and the accompanying runtime in your client script, and your project will become offline ready by caching all (or some) output assets.

## Install

`npm install offline-plugin [--save-dev]`

## Setup

First, instantiate the plugin with [options](#options) in your `webpack.config`:

```js
// webpack.config.js example

var OfflinePlugin = require('offline-plugin');

module.exports = {
  // ...

  plugins: [
    // ... other plugins
    // it always better if OfflinePlugin is the last plugin added
    new OfflinePlugin()
  ]
  // ...
}

```

Then, add the [runtime](#runtime) into your entry file (typically main entry):

```js
require('offline-plugin/runtime').install();
```

## Docs

* [Caches](docs/caches.md)
* [Update process](docs/updates.md)

## Options

**All options are optional and `offline-plugin` could be used without specifying them.** Also see full list of default options [here](https://github.com/NekR/offline-plugin/blob/master/src/index.js#L9).

#### `caches: 'all' | Object`

Tells to the plugin what to cache and how.

* `'all'`: means that everything (all the webpack output assets) and URLs listed in `externals` option will be cached on install.
* `Object`: Object with 3 possible `Array<string>` sections (properties): `main`, `additional`, `optional`. All sections are optional and by default are empty (no assets added).

[More details about `caches`](docs/caches.md)

> Default: `'all'`.

#### `publicPath: string`

Same as `publicPath` for `webpack` options, only difference is that absolute paths are not allowed  

> __Example:__  
Correct value: `/project/`  
Incorrect value: `https://example.com/project`

#### `responseStrategy: 'cache-first' | 'network-first'`
Response strategy. Whether to use a cache or network first for responses.
> Default: `'cache-first'`.

#### `updateStrategy: 'changed' | 'all'`
Cache update strategy. [More details about `updateStrategy`](docs/update-strategies.md)  
> Default: `'changed'`.

#### `externals: Array<string>`.
Explicitly marks the assets as _external_ assets that you can cache. If cache asset is not one of _webpack's generated assets_ and is not marked explicitly as _external_, you will receive warning about it into console. To cache external assets, add them to the `caches` object, by default `caches: 'all'` doesn't cache `externals`.

> Default: `null`  
> **Example value:** `['fonts/roboto.woff']`

#### `excludes: Array<string | globs_pattern>`
Excludes matches assets from being added to caches. Exclusion is performed before _rewrite_ happens.  
[Learn more about assets _rewrite_](docs/rewrite.md)

> Default: `['**/.*', '**/*.map']`  
> _Excludes all files which start with `.` or end with `.map`_

#### `relativePaths: boolean`
When set to `true`, all cache asset paths are generated relatively to `ServiceWorker` file or `AppCache` folder respectively.  
`publicPath` option is ignored when this is set to `true`.
> **Default:** `true`

#### `version: string | (plugin: OfflinePlugin) => void`
Version of the cache. Might be a function, useful in _watch-mode_ when you need to apply dynamic value.

* `Function` is called with plugin instance as first argument
* `string` can be interpolated with `[hash]` token

> Default: _Current date_

#### `rewrites: Function | Object`

Rewrite function or rewrite map (`Object`). Useful when assets are served in a different way from the client perspective, e.g. usually `index.html` is served as `/`.

[See more about `rewrites` option and default function](docs/rewrite.md)

#### `cacheMaps: Array<Object>`

See [documentation of `cacheMaps`](docs/cache-maps.md) for syntax and usage examples


#### `ServiceWorker: Object | null | false`

Settings for the `ServiceWorker` cache. Use `null` or `false` to disable `ServiceWorker` generation.

* `output`: `string`. Relative (from the _webpack_'s config `output.path`) output path for emitted script.  
_Default:_ `'sw.js'`

* `entry`: `string`. Relative or absolute path to file which will be used as `ServiceWorker` entry. Useful to implement additional function or handle other SW events.  
_Default:_ _empty file_

* `scope`: `string`. Reflects [ServiceWorker.register](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)'s `scope` option.  
_Default:_ `null`

* `cacheName`: `string`. **This option is very dangerous. Touching it you must realize that you should **not** change it after you go production. Changing it may corrupt the cache and leave old caches on users' devices. This option is useful when you need to run more than one project on _the same domain_.  
_Default:_ _`''`_ (empty string)
_Example:_ `'my-project'`

* `navigateFallbackURL`: `string`. The URL being returned from the caches when requested navigation URL isn't available. Similar to `AppCache.FALLBACK` option.  
_Example:_ `navigateFallbackURL: '/'`

* `events`: `boolean`. Enables runtime events for ServiceWorker. For supported events see `Runtime`'s `install()` options.
_Default:_ `false`

* `publicPath`: `string`. Provides a way to override `ServiceWorker`'s script file location on the server. Should be exact path to the generated `ServiceWorker` file.
_Default:_ `null`
_Example:_ `'my/new/path/sw.js'`

* `prefetchRequest`: `Object`. Provides a way to specify [request init options](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request) for pre-fetch requests (pre-cache requests on `install` event). Allowed options: `credentials`, `headers`, `mode`, `cache`.  
_Default:_ `{ credentials: 'omit', mode: 'cors' }`  
_Example:_ `{ credentials: 'same-origin' }`  

#### `AppCache: Object | null | false`

Settings for the `AppCache` cache. Use `null` or `false` to disable `AppCache` generation.

* `directory`: `string`. Relative (from the _webpack_'s config `output.path`) output directly path for the `AppCache` emitted files.  
_Default:_ `'appcache/'`

* `NETWORK`: `string`. Reflects `AppCache`'s `NETWORK` section.  
_Default:_ `'*'`

* `FALLBACK`: `Object`. Reflects `AppCache`'s `FALLBACK` section. Useful for single page applications making use of HTML5 routing or for displaying custom _Offline page_.  
_Example 1:_ `{ '/blog': '/' }` will map all requests starting with `/blog` to the domain roboto when request fails.  
_Example 2:_ `{ '/': '/offline-page.html' }` will return contents of `/offline-page.html` for any failed request.  
_Default:_ `null`

* `events`: `boolean`. Enables runtime events for AppCache. For supported events see `Runtime`'s `install()` options.  
_Default:_ `false`

* `publicPath`: `string`. Provides a way to override `AppCache`'s folder location on the server. Should be exact path to the generated `AppCache` folder.  
_Default:_ `null`  
_Example:_ `'my/new/path/appcache'`

* `disableInstall` :`boolean`. Disable the automatic installation of the `AppCache` when calling to `runtime.install()`. Useful when you to specify `<html manifest="...">` attribute manually (to cache every page user visits).  
_Default:_ `false`

* `includeCrossOrigin` :`boolean`. Outputs cross-origin URLs into `AppCache`'s manifest file. **Cross-origin URLs aren't supported in `AppCache` when used on HTTPS.**  
_Default:_ `false`

## Runtime

Besides plugin configuration, you also need to initialize it at runtime phase. It's done this way:

```js
require('offline-plugin/runtime').install();
```

### Methods

Runtime has following methods:

#### `install(options: Object)`

Starts installation flow for `ServiceWorker`/`AppCache` it's safe and must be called each time your page loads (i.e. do not wrap it into any conditions).

#### `applyUpdate()`

Used to apply update for existing installation. See `install` options below.

### `install` Options

Runtime `install` accepts 1 optional argument, `options` object. Right now you can use following runtime options:

_**Note:** Events must be explicitly enabled for each tool (`ServiceWorker`/`AppCache`) in their options._

#### `onInstalled`

Event called exactly once when `ServiceWorker` or `AppCache` is installed. Can be useful to display `"App is ready for offline usage"` message.

#### `onUpdating`

_Not supported for `AppCache`_

Event called when update is found and browsers started updating process. At this moment, some assets are downloading.

#### `onUpdateReady`

Event called when `onUpdating` phase finished. All required assets are downloaded at this moment and are ready to be updated. Call `runtime.applyUpdate()` to apply update.

#### `onUpdateFailed`

Event called when `upUpdating` phase failed by some reason. Nothing is downloaded at this moment and current update process in your code should be canceled or ignored.

#### `onUpdated`

Event called when update is applied, either by calling `runtime.applyUpdate()` or some other way by a browser itself.


## Who is using `offline-plugin`

### Projects

* [React Boilerplate](https://github.com/mxstbr/react-boilerplate)
* [Phenomic](https://phenomic.io)
* [Gatsby](https://github.com/gatsbyjs/gatsby)
* [Angular CLI](https://github.com/angular/angular-cli)

### PWAs

* [Offline Kanban](https://offline-kanban.herokuapp.com) ([source](https://github.com/sarmadsangi/offline-kanban))
* [Preact](https://preactjs.com/) ([source](https://github.com/developit/preact-www))
* [Omroep West (_Proof of Concept_)](https://omroep-west.now.sh/)


_If you are using `offline-plugin`, feel free to submit a PR to add your project to this list._


## FAQ

[FAQ](FAQ.md)


## License

[MIT](LICENSE.md)


## CHANGELOG

[CHANGELOG](CHANGELOG.md)

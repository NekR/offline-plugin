## Options

**All options are optional and `offline-plugin` can be used without specifying them.**  
_Also see list of default options [here](../src/default-options.js)._

#### `appShell: string`

[See `appShell` option documentation](app-shell.md)

> Default: `null`.
> **Example:** `'/index.html'`

#### `caches: 'all' | Object`

Allows you to define what to cache and how.

* `'all'`: means that everything (all the webpack output assets) and URLs listed in `externals` option will be cached on install.
* `Object`: Object with 3 possible `Array<string | RegExp>` sections (properties): `main`, `additional`, `optional`. All sections are optional and by default are empty (no assets added).

[More details about `caches`](caches.md)

> Default: `'all'`.

#### `publicPath: string`

Similar to `webpack`'s `output.publicPath` option. Useful to specify or override `publicPath` specifically for `offline-plugin`. When not specified, `webpack`'s `output.publicPath` value is used. When `publicPath` value isn't spsecified at all (either by this option or by `webpack`'s `output.publicPath` option), relative paths are used (see `relativePaths` option).

> __Examples:__  
`publicPath: '/project/'`  
`publicPath: 'https://example.com/project'`  

#### `responseStrategy: 'cache-first' | 'network-first'`
Response strategy. Whether to use a cache or network first for responses.

With `'cache-first'` all request are sent to consult the cache first and if the cache is empty, request is sent to the network.  

With `'network-first'` all request are sent to the network first and if network request fails consult the cache as a fallback.
> Default: `'cache-first'`.

#### `updateStrategy: 'changed' | 'all'`
Cache update strategy. [More details about `updateStrategy`](update-strategies.md)  
**Please, do not change this option unless you're sure you know what you're doing.**
> Default: `'changed'`.

#### `externals: Array<string>`

Allows you to specify additional (external to the build process) URLs to be cached. 

> Default: `null`  
> **Example:** `['/static/file-on-the-server.json', 'https://fonts.googleapis.com/css?family=Roboto']`

#### `excludes: Array<string | globs_pattern>`
Excludes matched assets from being added to the [caches](https://github.com/NekR/offline-plugin#caches-all--object). Exclusion is performed before [_rewrites_](https://github.com/NekR/offline-plugin/blob/master/docs/options.md#rewrites-function--object) happens.  
[Learn more about assets _rewrite_](rewrites.md)

> Default: `['**/.*', '**/*.map', '**/*.gz']`  
> _Excludes all files which start with `.` or end with `.map` or `.gz`_

#### `relativePaths: boolean`
When set to `true`, all the asset paths generated in the cache will be relative to the `ServiceWorker` file or the `AppCache` folder location respectively.  

This option is ignored when `publicPath` is set.
`publicPath` option is ignored when this option is set **explicitly** to `true`.
> Default: `true`

#### `version: string | (plugin: OfflinePlugin) => void`
Version of the cache. Can be a function, which is useful in _watch-mode_ when you need to apply dynamic value.

* `Function` is called with the plugin instance as the first argument
* `string` which can be interpolated with `[hash]` token

> Default: _Current date_

#### `rewrites: Function | Object`

Provides a way to rewrite final representation of the file on the server.  
Useful when assets are served in a different way from the client perspective, e.g. usually `/index.html` is served as `/`.

Can be either a function or an `Object`.

[See more about `rewrites` option and default function](rewrites.md)

#### `cacheMaps: Array<Object>`

See [documentation of `cacheMaps`](cache-maps.md) for syntax and usage examples

#### `autoUpdate: true | number`

Enables automatic updates of ServiceWorker and AppCache. If set to `true`, it uses default interval of _1 hour_. Set a `number` value to provide custom update interval.

_**Note:** Please note that if user has multiple opened tabs of your website then update may happen more often because each opened tab will have its own interval for updates._

> Default: `false`  
> **Example:** `true`  
> **Example:** `1000 * 60 * 60 * 5` (five hours)

#### `ServiceWorker: Object | null | false`

Settings for the `ServiceWorker` cache. Use `null` or `false` to disable `ServiceWorker` generation.

* **`output`**: `string`. Relative (from the _webpack_'s config `output.path`) output path for emitted script.  
_Default:_ `'sw.js'`

* **`entry`**: `string`. Relative or absolute path to the file which will be used as the `ServiceWorker` entry/bootstrapping. Useful to implement additional features or handlers for Service Worker events such as `push`, `sync`, etc.  
_Default:_ _empty file_

* **`scope`**: `string`. Reflects [ServiceWorker.register](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)'s `scope` option.  
_Default:_ `null`

* **`cacheName`**: `string`. **This option is very dangerous.** This option should **not** be changed at all after you deploy `ServiceWorker` to production. Changing it may corrupt the cache and leave old caches on users' devices.

This option is useful when you need to run more than one project on _the same domain_.  
_Default:_ _`''`_ (empty string)
_Example:_ `'my-project'`

* **`events`**: `boolean`. Enables runtime events for the ServiceWorker. For supported events see [`Runtime`](runtime.md)'s `install()` options.
_Default:_ `false`

* **`publicPath`**: `string`. Provides a way to override `ServiceWorker`'s script file location on the server. Should be an exact path to the generated `ServiceWorker` file.
_Default:_ `null`
_Example:_ `'/my/new/path/sw.js'`

* **`navigationPreload`**: `boolean | Object | ':auto:'`. [See `ServiceWorker.navigationPreload` option documentation](navigation-preload.md)

_Default:_ `':auto:'`

* **`prefetchRequest`**: `Object`. Provides a way to specify [request init options](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request) for pre-fetch requests (pre-cache requests on `install` event). Allowed options: `credentials`, `headers`, `mode`, `cache`.  
_Default:_ `{ credentials: 'omit', mode: 'cors' }`  
_Example:_ `{ credentials: 'include' }`  

* **`minify`**: `boolean`. If set to `true` or `false`, the `ServiceWorker`'s output will be minified or not accordingly. If set to something else, the `ServiceWorker` output will be minified **if** you are using `webpack.optimize.UglifyJsPlugin` in your configuration.  
_Default:_ `null`

* **`plugins`**: `Array`. The plugins which will be applied when compling the `ServiceWorker`'s script.
_Default:_ `[]`
_Example:_ `[new require('webpack').DefinePlugin({ CAT: 'MEOW' })]`

#### `AppCache: Object | null | false`

Settings for the `AppCache` cache. Use `null` or `false` to disable `AppCache` generation.

 > _**Warning**_: Officially the AppCache feature [has been deprecated](https://developer.mozilla.org/en-US/docs/Web/HTML/Using_the_application_cache) in favour of Service Workers.  However, Service Workers are still being implemented across all browsers (you can track progress [here](https://jakearchibald.github.io/isserviceworkerready/)) so AppCache is unlikely to suddenly disappear.  Therefore please don't be afraid to use the AppCache feature if you have a need to provide offline support to browsers that do not support Service Workers, but it is good to be aware of this fact and make a deliberate decision on your configuration.

* **`directory`**: `string`. Relative (from the _webpack_'s config `output.path`) output directly path for the `AppCache` emitted files.  
_Default:_ `'appcache/'`

* **`NETWORK`**: `string`. Reflects `AppCache`'s `NETWORK` section.  
_Default:_ `'*'`

* **`FALLBACK`**: `Object`. Reflects `AppCache`'s `FALLBACK` section. Useful for single page applications making use of HTML5 routing or for displaying custom _Offline page_.  
_Example 1:_ `{ '/blog': '/' }` will map all requests starting with `/blog` to the domain roboto when request fails.  
_Example 2:_ `{ '/': '/offline-page.html' }` will return contents of `/offline-page.html` for any failed request.  
_Default:_ `null`

* **`events`**: `boolean`. Enables runtime events for AppCache. For supported events see [`Runtime`](runtime.md)'s `install()` options.  
_Default:_ `false`

* **`publicPath`**: `string`. Provides a way to override `AppCache`'s folder location on the server. Should be exact path to the generated `AppCache` folder.  
_Default:_ `null`  
_Example:_ `'my/new/path/appcache'`

* **`disableInstall`**: `boolean`. Disable the automatic installation of the `AppCache` when calling `runtime.install()`. Useful when you want to specify `<html manifest="...">` attribute manually (to cache every page user visits).  
_Default:_ `false`

* **`includeCrossOrigin`**: `boolean`. Outputs cross-origin URLs into `AppCache`'s manifest file. **Cross-origin URLs aren't supported in `AppCache` when used on HTTPS.**  
_Default:_ `false`
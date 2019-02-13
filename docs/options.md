# Options

All options are optional, see the defaults [here](https://github.com/NekR/offline-plugin/blob/master/src/default-options.js).

#### `appShell: string`

Enables your application to work with the [app shell model](https://developers.google.com/web/fundamentals/architecture/app-shell). Set to the HTML file you want to return for all navigation requests.

*[More information about `appShell`](app-shell.md)*

> Default: `null`.
> **Example:** `'/app-shell.html'`

#### `responseStrategy: 'cache-first' | 'network-first'`

With `'cache-first'` all request are sent to consult the cache first and if the cache is empty, request is sent to the network.  With `'network-first'` all request are sent to the network first and if network request fails consult the cache as a fallback.

> Default: `'cache-first'`.

#### `externals: Array<string>`

Specify additional (external to the build process) URLs to be cached. 

> Default: `null`  
> **Example:** `['/static/img/media.png', 'https://fonts.googleapis.com/css?family=Roboto']`

#### `excludes: Array<string | globs_pattern>`

Excludes assets from being cached. Note: Exclusion is performed before [rewrites](https://github.com/NekR/offline-plugin/blob/master/docs/options.md#rewrites-function--object).

> Default: `['**/.*', '**/*.map', '**/*.gz']`  
> _Excludes all files which start with `.` or end with `.map` or `.gz`_

#### `autoUpdate: true | number`

Enable automatic updates of the ServiceWorker and AppCache. If set to `true`, it uses default interval of _1 hour_. Set a `number` value to provide custom update interval.

_**Note:** Please note that if user has multiple opened tabs of your website then update may happen more often because each opened tab will have its own interval for updates._

> Default: `false`  
> **Example:** `true`  
> **Example:** `1000 * 60 * 60 * 5` (five hours)

#### `relativePaths: boolean`

When set to `true`, all the asset paths generated in the cache will be relative to the `ServiceWorker` file or the `AppCache` folder location respectively.

This option is ignored when `publicPath` is set. `publicPath` option is ignored when this option is set **explicitly** to `true`.

> Default: `true`

#### `rewrites: Function | Object`

Provides a way to change the URL an asset is loaded from. This is useful when assets are served differently than the client expects, e.g. if you have them on a CDN.

[Read more about `rewrites` option and default function](rewrites.md)

> Default: Rewrite `/index.html` to `/`

#### `cacheMaps: Array<Object>`

See [documentation of `cacheMaps`](cache-maps.md) for syntax and usage examples

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

* **`minify`**: `boolean`. If set to `true` or `false`, the `ServiceWorker`'s output will be minified or not accordingly. If set to something else, the `ServiceWorker` output will be minified **if** you are using `webpack.optimize.UglifyJsPlugin` or `terser-webpack-plugin` in your configuration.
_Default:_ `null`

#### `publicPath: string`

Similar to `webpack`'s `output.publicPath` option. Useful to specify or override `publicPath` specifically for `offline-plugin`. When not specified, `webpack`'s `output.publicPath` value is used. When `publicPath` value isn't specified at all (either by this option or by `webpack`'s `output.publicPath` option), relative paths are used (see `relativePaths` option).

> __Examples:__  
`publicPath: '/project/'`  
`publicPath: 'https://example.com/project'`

#### `version: string | (plugin: OfflinePlugin) => void`

Version of the cache. Can be a function, which is useful in _watch-mode_ when you need to apply dynamic value.

* `Function` is called with the plugin instance as the first argument
* `string` which can be interpolated with `[hash]` token

> Default: _Current date and time_  
> **Example:** `2018-6-20 09:53:56`  
> Please note that if you use the default value (date and time), the version of service worker will change on each build of your project.

#### `caches: 'all' | Object`

Allows you to adjust what and how to cache the assets.

* `'all'`: means that everything (all the webpack output assets) and URLs listed in `externals` option will be cached on install.
* `Object`: Object with 3 possible `Array<string | RegExp>` sections (properties): `main`, `additional`, `optional`. All sections are optional and by default are empty (no assets added).

*[More information about `caches`](caches.md)*

> Default: `'all'`.


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

#### `updateStrategy: 'changed' | 'all'`
Cache update strategy. [More details about `updateStrategy`](update-strategies.md)  
**Please, do not change this option unless you're sure you know what you're doing.**
> Default: `'changed'`.


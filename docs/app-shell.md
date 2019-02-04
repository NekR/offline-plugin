# `appShell: string`

___________________________________

> Default: `null`.  
> **Example:** `'/'`

When making a Singe Page Application, it's common to use [AppShell](https://medium.com/google-developers/instant-loading-web-apps-with-an-application-shell-architecture-7c0c2f10c73) model for it.

To make `offline-plugin` redirect all unknown navigation requests to a specific cache, specify `appShell` option, e.g. `appShell: '/'`.

### SSR

When using Server Side Rendering with AppShell model, make sure that you do not cache any server rendered data with it. Easiest way would be to make a route which will be serving the HTML file without any server rendered data in it (e.g. ready for client side rendering) and cache that route. Example: `appShell: '/app-shell.html'`

### Advanced

`appShell` is baked by `cacheMaps` option for `ServiceWorker` and `AppCache.FALLBACK` option for `AppCache`.

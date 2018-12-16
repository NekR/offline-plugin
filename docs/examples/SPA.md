# Using offline-plugin in a Single Page Application (SPA)

---

In a simple SPA, the server serves the same `index.html` page for all routes. When the page is loaded, the client decides what to render given the current route. So how should we configure `offline-plugin` to handle this?

The first thing we should do is to tell `offline-plugin` to cache the root `/` route. We can do this by adding it to `externals`. The reason is that we are caching a resource which is not bundled with webpack, and therefor considered external. If you are generating your html with `html-webpack-plugin`, there's no need to add for this.

```javascript
externals: [
  '/'
]
```

We should also specify the [`appShell`](../app-shell.md) option, which instructs the service worker to redirect any non-cached navigation request to the specified route.

```javascript
appShell: '/'
```

If we are using `AppCache`, then `appShell` option will be applied to it as well.

If we want to display custom error page for `AppCache` instead, we can specify redirection behavior using the `FALLBACK` option.

```javascript
AppCache: {
  FALLBACK: { '/': '/offline-page.html' }
}
```

Make sure our `appShell` option refers to existing path on the website. For example, if our is being served from `/myapp/` then `appShell` option should refer to `/myapp/` as well.

A complete configuration could look like this:

```javascript
new OfflinePlugin({
  // Unless specified in webpack's configuration itself
  publicPath: '/myapp/',

  appShell: '/myapp/',
  externals: [
    '/myapp/'
  ]
})
```
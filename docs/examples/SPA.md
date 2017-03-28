## Using offline-plugin in a Single Page Application (SPA)

In a simple SPA, the server serves the same `index.html` page for all routes. When the page is loaded, the client decides what to render given the current route. So how should we configure offline-plugin to handle this?

The first thing we should do is to tell offline-plugin to cache the root `/` route. We can do this by adding it to `externals`. The reason is that we are caching a resource which is not bundled with webpack, and therefor considered external. If you are generating your html with `html-webpack-plugin`, there's no need to add for this.

```javascript
externals: [
  '/'
]
```

We should also specify the `ServiceWorker.navigateFallbackURL`, which instructs the service worker to redirect any non-cached navigation request to the specified route.

```javascript
ServiceWorker: {
  navigateFallbackURL: '/'
}
```

If we are using `AppCache`, we can specify redirection behaviour using the `FALLBACK` option. For example if we want to return contents of /offline-page.html for any failed request.

```javascript
AppCache: {
  FALLBACK: { '/': '/offline-page.html' }
}
```

In addition to these options, we also need to tell offline-plugin how other resources should be cached. A complete configuration could look like this.

```javascript
new OfflinePlugin({
  publicPath: '/',
  caches: {
    main: [
      'app.*.css',
      'vendor.*.js',
      'app.*.js',
    ],
    additional: [
      ':externals:'
    ],
    optional: [
      ':rest:'
    ]
  },
  externals: [
    '/'
  ],
  ServiceWorker: {
    navigateFallbackURL: '/'
  },
  AppCache: {
    FALLBACK: {
      '/': '/offline-page.html'
    }
  }
})
```
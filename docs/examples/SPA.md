## Using offline-plugin in a Single Page Application (SPA)

In a SPA, only the inital HTML is served from the server. Any routing beyond that takes place on the client. So how should we configure offline-plugin to handle this?

The first thing we should do is to tell offline-plugin to cache the root `/` route. We can do this by adding it to `caches.main`.

```javascript
caches: {
  main: [
    '/'
  ]
}
```

If we do this and build our project, we will get a warning; ` WARNING in OfflinePlugin: Cache asset [/] is not found in the output assets,if it's an external asset, put it to the |externals| option to remove this warning`. The reason is that we are caching a resource which is not bundled with webpack, and therefor considered external.

To get rid of this message, simply follow the instructions and add it to `externals`.

```javascript
externals: [
  '/'
]
```

The last thing we can do is to specify the `ServiceWorker.fallbackURL`, which instructs the service worker to redirect any non-cached request to the specified route.

```javascript
ServiceWorker: {
  navigateFallbackURL: '/'
}
```

In addition to these options, we also need to tell offline-plugin how other resources should be cached. A complete configuration could look like this.

```javascript
new OfflinePlugin({
  externals: [
    'apple-touch-icon.png',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'favicon.png',
    'safari-pinned-tab.svg',
    '/'
  ],
  publicPath: '/',
  caches: {
    main: [
      '/',
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
  ServiceWorker: {
    publicPath: '/sw.js',
    events: true,
    navigateFallbackURL: '/'
  }
})
```
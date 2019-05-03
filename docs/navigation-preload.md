# `navigationPreload: boolean | Object | ':auto:'`

___________________________________

> _Default:_ `':auto:'`

[Navigation preload](https://developers.google.com/web/updates/2017/02/navigation-preload) is a ServiceWorker's feature which provides a way to make a request to the website even before ServiceWorker or a page is initialized. This can be useful for data fetching to speedup loading of the application.

### Usage

In `offline-plugin`, _Navigation preload_ behaves differently for `cache-first` and `network-first` response strategies.

For `network-first` navigation preload is enabled by default and allows to fetch navigation pages ahead of time, even before ServiceWorker was initialized. To disabled it set `ServiceWorker.navigationPreload` option to `false`.

For `cache-first` navigation preload has to be enabled manually and also handled on the server side. To enabled navigation preload two functions has to be specified:

```js
ServiceWorker: {
  navigationPreload: {
    map: (url) => {
      if (url.pathname === '/') {
        return '/api/feed';
      }

      var post = url.pathname.match(/^\/post\/(\d+)$/);

      if (post) {
        return '/api/post/' + post[1];
      }
    },
    test: (url) => {
      if (url.pathname.indexOf('/api/') === 0) {
        return true;
      }
    }
  },
}
```

* `map` function is used to map navigation preload request to other requests, e.g. API requests.
* `test` function is used to test for possible consumers of navigation preload mapping

In previous example `map` function maps navigation preload of `/` to `/api/feed`. Then when a request to `/api/feed` happens, `test` function is used to determine that such request might be preloaded with _navigation preload_ (it checks if `pathname` of the request starts with `/api/`).

#### Server Side

When a navigation preload request happens, it contains `Service-Worker-Navigation-Preload: true` header. Server side should use this header to detect the preload and send different content to such request.

Express.js example:

```js
function serveIndex(req, res) {
  if (req.headers['service-worker-navigation-preload']) {
    res.set({
      'Cache-Control': 'no-cache',
      'Vary': 'Service-Worker-Navigation-Preload'
    });

    fetchFeedData(req).then((data) => {
      res.send(data);
    });

    return;
  }

  res.sendFile(path.join(WWW_FOLDER, 'index.html'), {
    cacheControl: false,
    acceptRanges: false,
    headers: {
      'Cache-Control': 'no-cache',
      'Vary': 'Service-Worker-Navigation-Preload'
    }
  });
}
```

Make sure to set **`'Vary': 'Service-Worker-Navigation-Preload'`** header if you're planning on caching those responses.

For more details on Navigation Preload see [this article](https://developers.google.com/web/updates/2017/02/navigation-preload).
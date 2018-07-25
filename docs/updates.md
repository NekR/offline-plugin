# `ServiceWorker` and `AppCache` update process

___________________________________

Browser fetches `ServiceWorker` file each time user _navigates_ to your website. If new `ServiceWorker` is found, browser immediately runs it along side with current SW. This new SW gets only `install` event at this time, which allows it to prepare/cache assets of the new version. New SW **doesn't start controlling pages until all tabs of your website are closed**, this is by design in the `ServiceWorker`.

`AppCache` has slightly simpler update mechanism: browser also downloads `manifest.appcache` on each _navigation_ to your site (_simplified_) and if new `AppCache` is available, browser installs new `AppCache` and removes old one. This means that on a next page refresh browser will load files from the new `AppCache`.

Sometimes, `AppCache` is the root of confusion--one may just expect SW to have the same update process as `AppCache` have. Another confusing thing could be `Cmd/Ctrl+R` combination. One may think that it _forces_ browser to update and activate SW. This is wrong, `Cmd/Ctrl+R` doesn't updates or reloads into a new SW, it just tells to browser to **bypass** currently controlling `ServiceWorker`.

If you have only 1 tab of your website opened, then this flow can update SW:

1. `Refresh` the page (browser downloads new SW)
2. `Ctrl/Cmd+Refresh` the page (browser bypasses SW). Now current SW doesn't control any pages, so it will be discarded and new SW will be _activated_
3. `Refresh` the page (new SW is now in place and controls the page)

This is how it works. Of course, there is a way to update SW/AppCache when you want it, you are the developer after all :-)

### Config

Tell to `OfflinePlugin` to generate events for `ServiceWorker`:

```js
// offline-plugin config

new OfflinePlugin({
  ServiceWorker: {
    events: true
  }
})
```

Tell to `offline-plugin/runtime` to use life-cycle events and apply any update immediately:

```js
// client-side code

const runtime = require('offline-plugin/runtime');

runtime.install({
  onUpdating: () => {
    console.log('SW Event:', 'onUpdating');
  },
  onUpdateReady: () => {
    console.log('SW Event:', 'onUpdateReady');
    // Tells to new SW to take control immediately
    runtime.applyUpdate();
  },
  onUpdated: () => {
    console.log('SW Event:', 'onUpdated');
    // Reload the webpage to load into the new version
    window.location.reload();
  },

  onUpdateFailed: () => {
    console.log('SW Event:', 'onUpdateFailed');
  }
});
```

There is a similar option for AppCache: `AppCache: { events: true }`, but I don't recommend using it unless you really need to. AppCache's events are unstable because they behave differently in different browsers and some hacks have been applied to make it work as it does now. The events are unstable because they may fail to fire, or fire twice. These problems are mostly because AppCache is loaded in an iframe and every browser behaves different in this case (regarding events).

In general, AppCache events work and should work fine. But don't expect them to be bulletproof or something like that. This is why they are marked unstable.

#### Making sure `ServiceWorker` updates at all

_This meant to be tested without adding any code to control SW's update process_

1. Load your webpage
2. Build and deploy new version with something changed, add `alert(1)` for example
3. Reload the webpage
4. Close the tab of the webpage (make sure there is no more open tabs of this website)
5. Open that webpage again in a _new tab_
6. Check if you see `alert(1)`

___________________________________
_For additional information about `ServiceWorker` life-cycle watch [this video](https://twitter.com/jaffathecake/status/709011058938269696) by Jake Archibald_

<script>
  (function() {
    // ################################

    var updatingFired;

    applicationCache.addEventListener('updateready', onUpdateReadyEvent);
    applicationCache.addEventListener('cached', onInstalledEvent);
    applicationCache.addEventListener('obsolete', onObsoleteEvent);

    applicationCache.addEventListener('downloading', onDownloadingEvent);
    applicationCache.addEventListener('progress', onDownloadingEvent);

    // Race condition is possible, because Application Cache is running in
    // the background, so we need to check if we missed some events.
    // See Pitfall 3 and 4 at
    // http://labnote.beedesk.com/the-pitfalls-of-html5-applicationcache

    switch (applicationCache.status) {
      case applicationCache.DOWNLOADING: {
        setTimeout(onDownloadingEvent, 1);
      } break;
      case applicationCache.OBSOLETE: {
        setTimeout(onObsoleteEvent, 1);
      } break;
      case applicationCache.UPDATEREADY: {
        setTimeout(onUpdateReadyEvent, 1);
      } break;
    }

    // ###############################

    function onDownloadingEvent() {
      if (!updatingFired) {
        updatingFired = true;
        onUpdating();
      }
    }

    function onUpdateReadyEvent() {
      if (!updatingFired) {
        updatingFired = true;
        onUpdating();
        setTimeout(onUpdateReady, 1);
      } else {
        onUpdateReady();
      }
    }

    function onInstalledEvent() {
      onInstalled();
    }

    function onObsoleteEvent() {
      onUpdateFailed();
      setTimeout(onUninstalled, 1);
    }

    // ################################
  }());

  function onUpdating() {
    // sendEvent('onUpdating');
  }

  function onUpdateReady() {
    sendEvent('onUpdateReady');
  }

  function onUpdateFailed() {
    sendEvent('onUpdateFailed');
  }

  function onUninstalled() {
    sendEvent('onUninstalled');
  }

  function onInstalled() {
    sendEvent('onInstalled');
  }

  function sendEvent(event) {
    window.parent.postMessage('__offline-plugin_AppCacheEvent:' + event, '*');
  }

  window.__applyUpdate = function() {
    applicationCache.swapCache();
    sendEvent('onUpdated');
  };
</script>

var unknownUpdate = true;
var appCacheIframe;

function hasSW() {
  return 'serviceWorker' in navigator &&
    (window.fetch || 'imageRendering' in document.documentElement.style) &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
}

function install(options) {
  options || (options = {});

  <% if (typeof ServiceWorker !== 'undefined') { %>
    if (hasSW()) {
      var registration = navigator.serviceWorker
        .register(<%- JSON.stringify(ServiceWorker.output) %>);

      <% if (ServiceWorker.events) { %>
        var handleUpdating = function(registration) {
          var sw = registration.installing || registration.waiting;
          var ignoreInstalling;
          var ignoreWaiting;

          if (!sw) return;
          onStateChange();

          ignoreInstalling = true;
          if (registration.waiting) {
            ignoreWaiting = true;
          }

          sw.onstatechange = onStateChange;

          function onStateChange() {
            switch (sw.state) {
              case 'redundant': {
                if (options.onUpdateFailed) {
                  options.onUpdateFailed();
                }
              } break;

              case 'installing': {
                if (!ignoreInstalling && options.onUpdating) {
                  options.onUpdating();
                }
              } break;

              case 'installed': {
                if (!ignoreWaiting && options.onUpdateReady) {
                  options.onUpdateReady();
                }
              } break;

              case 'activated': {
                if (options.onUpdated) {
                  options.onUpdated(unknownUpdate);
                }
              } break;
            }
          }
        };

        registration.then(function(reg) {
          // WTF no reg?
          if (!reg) return;
          // Not installed
          if (!reg.active) return;
          // Installed but Shift-Reloaded (page is not controller by SW),
          // still, update might be ready at this point (more than one tab opened).
          // Anyway, if page is hard-reloaded, then it probably already have latest version
          // but it's controlled by SW yet. Applying update will claim this page
          // to be controlled by SW. Maybe set flag to not reload it?
          // if (!navigator.serviceWorker.controller) return;

          handleUpdating(reg);
          reg.onupdatefound = function() {
            handleUpdating(reg);
          };
        }).catch(function(err) {
          if (options.onError) {
            options.onError(err);
          }

          return Promise.reject(err);
        });
      <% } %>

      return;
    }
  <% } %>

  <% if (typeof AppCache !== 'undefined') { %>
    if (window.applicationCache) {
      var directory = <%- JSON.stringify(AppCache.directory) %>;
      var name = <%- JSON.stringify(AppCache.name) %>;

      var doLoad = function() {
        var page = directory + name + '.html';
        var iframe = document.createElement('iframe');

        <% if (AppCache.events) { %>
          window.addEventListener('message', function(e) {
            if (e.source !== iframe.contentWindow) return;

            var match = (e.data + '').match(/__offline-plugin_AppCacheEvent:(\w+)/);
            var event = match[1];

            if (typeof options[event] === 'function') {
              options[event]();
            }
          });
        <% } %>

        iframe.src = page;
        iframe.style.display = 'none';

        appCacheIframe = iframe;
        document.body.appendChild(iframe);
      };

      if (document.readyState === 'complete') {
        setTimeout(doLoad);
      } else {
        window.addEventListener('load', doLoad);
      }

      return;
    }
  <% } %>
}

function applyUpdate(callback, errback) {
  <% if (typeof ServiceWorker !== 'undefined' && ServiceWorker.events) { %>
    if (hasSW()) {
      navigator.serviceWorker.getRegistration().then(function(registration) {
        if (!registration || !registration.waiting) {
          errback && errback();
          return;
        }

        unknownUpdate = false;
        registration.waiting.postMessage({
          action: 'skipWaiting'
        });

        callback && callback();
      });

      return;
    }
  <% } %>

  <% if (typeof AppCache !== 'undefined' && AppCache.events) { %>
    if (appCacheIframe) {
      try {
        appCacheIframe.contentWindow.applicationCache.swapCache();
        callback && setTimeout(callback);
      } catch (e) {
        errback && setTimeout(errback);
      }
    }
  <% } %>
}

exports.install = install;
exports.applyUpdate = applyUpdate;
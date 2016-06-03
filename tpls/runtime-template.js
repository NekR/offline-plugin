var appCacheIframe;

function hasSW() {
  return 'serviceWorker' in navigator &&
    // This is how I block Chrome 40 and detect Chrome 41, because first has
    // bugs with history.pustState and/or hashchange
    (window.fetch || 'imageRendering' in document.documentElement.style) &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
}

function install(options) {
  options || (options = {});

  <% if (typeof ServiceWorker !== 'undefined') { %>
    if (hasSW()) {
      var registration = navigator.serviceWorker
        .register(
          <%- JSON.stringify(ServiceWorker.output) %>
          <% if (ServiceWorker.scope) { %>
            , { scope: <%- JSON.stringify(ServiceWorker.scope) %> }
          <% } %>
        );

      <% if (ServiceWorker.events) { %>
        var handleUpdating = function(registration) {
          var sw = registration.installing || registration.waiting;
          var ignoreInstalling;
          var ignoreWaiting;

          // No SW or already handled
          if (!sw || sw.onstatechange) return;

          var stateChangeHandler;

          // Already has SW
          if (registration.active) {
            onUpdateStateChange();
            stateChangeHandler = onUpdateStateChange;
          } else {
            onInstallStateChange();
            stateChangeHandler = onInstallStateChange;
          }

          ignoreInstalling = true;
          if (registration.waiting) {
            ignoreWaiting = true;
          }

          sw.onstatechange = stateChangeHandler;

          function onUpdateStateChange() {
            switch (sw.state) {
              case 'redundant': {
                sendEvent('onUpdateFailed');
                sw.onstatechange = null;
              } break;

              case 'installing': {
                if (!ignoreInstalling) {
                  sendEvent('onUpdating');
                }
              } break;

              case 'installed': {
                if (!ignoreWaiting) {
                  sendEvent('onUpdateReady');
                }
              } break;

              case 'activated': {
                sendEvent('onUpdated');
                sw.onstatechange = null;
              } break;
            }
          }

          function onInstallStateChange() {
            switch (sw.state) {
              case 'redundant': {
                // Failed to install, ignore
                sw.onstatechange = null;
              } break;

              case 'installing': {
                // Installing, ignore
              } break;

              case 'installed': {
                // Installed, wait activation
              } break;

              case 'activated': {
                sendEvent('onInstalled');
                sw.onstatechange = null;
              } break;
            }
          }
        };

        var sendEvent = function(event) {
          if (typeof options[event] === 'function') {
            options[event]({
              source: 'ServiceWorker'
            });
          }
        };

        registration.then(function(reg) {
          // WTF no reg?
          if (!reg) return;

          // Installed but Shift-Reloaded (page is not controller by SW),
          // update might be ready at this point (more than one tab opened).
          // Anyway, if page is hard-reloaded, then it probably already have latest version
          // but it's not controlled by SW yet. Applying update will claim this page
          // to be controlled by SW. Maybe set flag to not reload it?
          // if (!navigator.serviceWorker.controller) return;

          handleUpdating(reg);
          reg.onupdatefound = function() {
            handleUpdating(reg);
          };
        }).catch(function(err) {
          sendEvent('onError');
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
              options[event]({
                source: 'AppCache'
              });
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
        appCacheIframe.contentWindow.__applyUpdate();
        callback && setTimeout(callback);
      } catch (e) {
        errback && setTimeout(errback);
      }
    }
  <% } %>
}

exports.install = install;
exports.applyUpdate = applyUpdate;
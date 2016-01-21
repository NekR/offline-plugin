function install(options, callback, errback) {
  callback || (callback = function() {});
  errback || (errback = function() {});

  <% if (typeof ServiceWorker !== 'undefined') { %>
    if (
      'serviceWorker' in navigator &&
      (window.fetch || 'imageRendering' in document.documentElement.style) &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    ) {
      navigator.serviceWorker
        .register(<%- JSON.stringify(ServiceWorker.output) %>)
        .then(function() {
          callback({
            service: 'ServiceWorker'
          });
        }).catch(function(err) {
          errback({
            service: 'ServiceWorker'
          });

          return Promise.reject(err);
        });

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

        iframe.src = page;
        iframe.style.display = 'none';

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

  setTimeout(function() {
    callback({
      service: ''
    });
  });
}

exports.install = install;
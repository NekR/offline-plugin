var path = require('path');

var express = require('express');
var app = express();

var WWW_FOLDER = path.join(__dirname, 'www');

app.get('/', serveIndex);

app.get('/sw.js', serveServiceWorker);
app.use(express.static(WWW_FOLDER));

app.get('/*', serveNotFound);

let indexPreload = 0;
let notFoundPreload = 0;

function serveServiceWorker(req, res) {
  res.sendFile(path.join(WWW_FOLDER, 'sw.js'), {
    cacheControl: false,
    acceptRanges: false,
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
}

function serveIndex(req, res) {
  if (req.headers['service-worker-navigation-preload']) {
    res.send(`
      <!doctype html>
      <body>
        <div id="page">preload index</div>
        <script src="/main.js"></script>
      </body>
    `);

    return;
  }

  res.sendFile(path.join(WWW_FOLDER, 'index.html'), {
    cacheControl: false,
    acceptRanges: false,
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
}

function serveNotFound(req, res) {
  res.sendStatus(404);
}

// Not used
/*function serveAppShell(req, res) {
  res.sendFile(path.join(WWW_FOLDER, 'app-shell.html'), {
    cacheControl: false,
    acceptRanges: false,
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
}
*/

module.exports = __createServer(app);
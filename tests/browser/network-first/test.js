const puppeteer = require('puppeteer');

const server = require('./server');
const webpack = __buildWebpack('webpack.config.js');

module.exports = new Promise((resolve) => {
  after(async () => {
    (await server).close();
    resolve();
  });
});

describe('testing basic `network-first` sw install', async () => {
  let browser;
  let page;

  before(async () => {
    await server;
    await webpack;

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
  });

  after(async () => {
    // await browser.close();
  });

  it('should open page and install service-worker', async () => {
    await page.goto(`${__SERVER__}/`);
    await page.evaluate(function() {
      return navigator.serviceWorker.ready;
    });
  });

  it('should go to generated sw file location and get its contents', async () => {
    const swScriptPage = await browser.newPage();

    await swScriptPage.goto(`${__SERVER__}/sw.js`);

    await swScriptPage.evaluate(function() {
      const contents = document.body.textContent.trim();

      if (contents.indexOf('var __wpo = {') !== 0) {
        throw new Error('Incorrect page contents');
      }
    });
  });

  it('should perform 2 preloads concurrently', async () => {
    const [ index, notFound ] = await Promise.all([
      browser.newPage(), browser.newPage()
    ]);

    await Promise.all([
      index.goto(`${__SERVER__}/`),
      notFound.goto(`${__SERVER__}/not-found`)
    ]);

    // await new Promise(resolve => setTimeout(resolve, 5000));

    await Promise.all([
      index.evaluate(function() {
        const page = document.querySelector('#page').textContent.trim();

        if (page !== 'preload index') {
          throw new Error('Incorrect page: ' + page + ', expected: preload index');
        }
      }),

      notFound.evaluate(function() {
        const page = document.querySelector('#page').textContent.trim();

        if (page !== 'preload not-found') {
          throw new Error('Incorrect page: ' + page + ', expected: preload not-found');
        }
      })
    ]);

    await Promise.all([
      index.close(),
      notFound.close()
    ]);
  });

  it('should clean preload caches after its usage from memory', async () => {
    await page.evaluate(function() {
      return caches.open('webpack-offline$preload').then(cache => {
        return cache.keys();
      }).then(keys => {
        if (keys.length > 1) {
          throw new Error('Preload caches has not been cleaned');
        }
      });
    });
  });

  it('should reload page and perform navigation preload for it', function() {
    // this.timeout(12000);

    // page.close();

    return (async () => {
      // await new Promise(resolve => setTimeout(resolve, 10000));

      // page = await browser.newPage();
      // await page.goto(`${__SERVER__}/`);

      await page.reload();
      await page.evaluate(function() {
        const page = document.querySelector('#page').textContent.trim();

        if (page !== 'preload index') {
          throw new Error('Incorrect page: ' + page + ', expected: preload index');
        }
      });
    })();
  });

  it('should reload page and perform navigation preload for it (again)', async () => {
    await page.reload();
    await page.evaluate(function() {
      const page = document.querySelector('#page').textContent.trim();

      if (page !== 'preload index') {
        throw new Error('Incorrect page: ' + page + ', expected: preload index');
      }
    });
  });

  it('should set offline mode and reload main page from the cache', async () => {
    await page.setOfflineMode(true);
    await page.reload();

    await page.evaluate(function() {
      const page = document.querySelector('#page').textContent.trim();

      if (page !== 'index') {
        throw new Error('Incorrect page:' + page);
      }
    });
  });

  it('should go to an unknown page and load from the app-shell cache', async () => {
    await page.goto(`${__SERVER__}/not-found`);

    await page.evaluate(function() {
      const page = document.querySelector('#page').textContent.trim();

      if (page !== 'app-shell') {
        throw new Error('Incorrect page:' + page);
      }
    });
  });
});

const puppeteer = require('puppeteer');

const server = require('./server');
const webpack = __buildWebpack('webpack.config.js');



module.exports = new Promise((resolve) => {
  after(async () => {
    (await server).close();
    resolve();
  });
});

describe('testing failed assets on `activate` event', async () => {
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

  it('should go to an failed to cache page and fail to load', async () => {
    await page.goto(`${__SERVER__}/not-existent`).then(() => {
      throw new Error('Page successfully loaded');
    }, () => {});
  });
});

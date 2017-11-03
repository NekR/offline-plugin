const puppeteer = require('puppeteer');

module.exports = new Promise((resolve) => {
  after(() => resolve());
});

describe('testing basic sw install', async () => {
  let browser;
  let page;

  before(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  after(async () => {
    await browser.close();
  });

  it('should open page and install service-worker', async () => {
    await page.goto('http://127.0.0.1:9090/');
    await page.evaluate(function() {
      return navigator.serviceWorker.ready;
    });
  });

  it('should set offline mode and reload main page from the cache', async () => {
    await page.setOfflineMode(true);
    await page.reload();

    await page.goto('http://127.0.0.1:9090/not-found');
    await page.evaluate(function() {
      if (document.querySelector('#page').textContent.trim() !== 'app-shell') {
        throw new Error('Incorrect page');
      }
    });
  });

  /*const dimensions = await page.evaluate(() => {
    return {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      deviceScaleFactor: window.devicePixelRatio
    };
  });*/

  /*page.on('console', msg => console.log('PAGE LOG:', ...msg.args));

  await page.evaluate(() => console.log(`url is ${location.href}`));*/
});
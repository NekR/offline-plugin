const puppeteer = require('puppeteer');

const server = require('./server');
const webpack = __buildWebpack('webpack.config.js');



module.exports = new Promise((resolve) => {
  after(async () => {
    (await server).close();
    resolve();
  });
});

describe('testing failed assets on `install` event', async () => {
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

  it('should open page and fail to install service-worker', async () => {
    await page.goto(`${__SERVER__}/`);
    await page.evaluate(() => {
      return navigator.serviceWorker.getRegistration().then(registration => {
        // Failed to install
        if (!registration) return true;

        return registration.installing || registration.waiting || registration.active;
      }).then(sw => {
        // Failed to install
        if (!sw) return true;

        return new Promise((resolve, reject) => {
          const check = () => {
            if (sw.state === 'installed' || sw.state === 'activated') {
              sw.onstatechange = null;
              reject();
              return;
            }

            if (sw.state === 'redundant') {
              sw.onstatechange = null;
              resolve();
              return;
            }
          };

          sw.onstatechange = check;
          check();
        });
      });
    });
  });
});

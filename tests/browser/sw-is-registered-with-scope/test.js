const puppeteer = require('puppeteer');

const server = require('./server');
const webpack = __buildWebpack('webpack.config.js');

module.exports = new Promise((resolve) => {
  after(async () => {
    (await server).close();
    resolve();
  });
});

describe('testing getRegistration with scope', async () => {
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

  it('should get registration for scope', async () => {
    await page.goto(`${__SERVER__}/`);
    await page.evaluate(() => {
      return navigator.serviceWorker.getRegistration('/app')
        .then(registration => {
          if (registration === undefined) return false;

          return registration.scope;
        })
        .then(scope => {
          if (scope === undefined) return false;

          return new Promise((resolve, reject) => {
              if (scope === 'http://127.0.0.1:9090/app') {
                  return resolve()
              } else {
                return reject(`Expected registration scope to be 'http://127.0.0.1:9090/app', was '${scope}'`)
              }
            });
        });
    });
  });
});

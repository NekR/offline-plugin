const puppeteer = require("puppeteer");

const server = require("./server");
const webpack = __buildWebpack("webpack.config.js");

module.exports = new Promise(resolve => {
  after(async () => {
    (await server).close();
    resolve();
  });
});

describe("testing dynamic public paths", function() {
  let browser;
  let page;

  before(async () => {
    await server;
    await webpack;

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    page = await browser.newPage();
  });

  after(async () => {
    // await browser.close();
  });

  it("should use __webpack_public_path__ to load sw.js", async function() {
    await page.goto(`${__SERVER__}/`);
    await page.evaluate(function() {
      return navigator.serviceWorker.ready;
    });
  });
});

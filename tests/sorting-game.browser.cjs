const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const data = require('../data/sorting-game.json');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const target = file === root ? path.join(root, 'index.html') : file;
  fs.readFile(target, (error, body) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(target)] || 'application/octet-stream');
    res.end(body);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
    fs.mkdirSync(path.join(root, 'outputs'), { recursive: true });
    for (const viewport of [{width:1440,height:900},{width:375,height:812}]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
      await page.locator('#material-options .material-option').first().waitFor({ state: 'attached' });
      await page.locator('#material-menu summary').click();
      assert.equal(await page.locator('#material-options svg').count(), await page.locator('#material-options button').count());
      await page.locator('[data-value="paper"]').click();
      assert.equal(await page.locator('#material-label').textContent(), 'Paper');
      assert.equal(await page.locator('#material').inputValue(), 'paper');
      await page.locator('.reset').click();
      assert.equal(await page.locator('#material-label').textContent(), 'Filter by material');
      await page.locator('#material-menu summary').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#material-menu').evaluate((node) => node.open), false);
      await page.locator('[data-tab="guide"]').click();
      await page.locator('[data-item="bottle"]').waitFor();
      assert.equal(await page.locator('.game-item').count(), 6);
      await page.locator('[data-item="bottle"]').click();
      await page.locator('#destination-recycling').click();
      assert.match(await page.locator('.game-feedback').textContent(), /water/);
      await page.getByRole('button', { name: 'Empty the water', exact: true }).click();
      await page.locator('#destination-recycling').click();
      assert.equal(await page.locator('.game-item:disabled').count(), 1);
      await page.locator('[data-item="paper"]').click();
      await page.locator('#destination-residual').click();
      assert.match(await page.locator('.game-feedback').textContent(), /clean and dry/);
      await page.locator('#destination-recycling').click();
      await page.locator('[data-item="battery"]').focus();
      await page.keyboard.press('Enter');
      await page.locator('#destination-special').focus();
      await page.keyboard.press('Enter');
      await page.locator('[data-item="can"]').dragTo(page.locator('#destination-recycling'));
      for (const id of ['tissue','jar']) {
        await page.locator(`[data-item="${id}"]`).click();
        await page.locator(`#destination-${data.items.find((x) => x.id === id).destination}`).click();
      }
      assert.equal(await page.locator('.game-ending').count(), 1);
      await page.getByRole('button', { name: 'Find battery collection points', exact: true }).click();
      assert.equal(await page.locator('#material').inputValue(), 'battery');
      await page.locator('[data-tab="guide"]').click();
      await page.getByRole('button', { name: 'Try a trickier bag', exact: true }).click();
      assert.equal(await page.locator('[data-item="dirty-paper"]').count(), 1);
      assert.equal(await page.locator('[data-item="phone"]').count(), 1);
      await page.locator('[data-item="dirty-paper"]').click();
      await page.locator('#destination-recycling').click();
      assert.match(await page.locator('.game-feedback').textContent(), /food oil/);
      await page.locator('#destination-residual').click();
      await page.locator('[data-tab="feedback"]').click();
      await page.locator('[data-tab="guide"]').click();
      await page.locator('[data-item="phone"]').waitFor();
      assert.equal(await page.locator('.game-item:disabled').count(), 1);
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        gameWidth: document.querySelector('.sorting-game').getBoundingClientRect().width,
        viewport: innerWidth
      }));
      assert(!geometry.overflow);
      assert(geometry.gameWidth < geometry.viewport);
      await page.locator('[data-item="phone"]').click();
      await page.screenshot({ path: path.join(root, 'outputs', `guide-${viewport.width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Start this bag again', exact: true }).click();
      assert.equal(await page.locator('.game-item:disabled').count(), 0);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ viewport, geometry, pageErrors: errors, result: 'passed: preparation, retry, keyboard, drag, completion, next bag, persistence' }));
      await context.close();
    }
    const failureContext = await browser.newContext();
    const failurePage = await failureContext.newPage();
    await failurePage.route('**/data/sorting-game.json', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
    await failurePage.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
    await failurePage.locator('[data-tab="guide"]').click();
    await failurePage.getByRole('button', { name: 'Try again', exact: true }).waitFor();
    await failurePage.unroute('**/data/sorting-game.json');
    await failurePage.getByRole('button', { name: 'Try again', exact: true }).click();
    await failurePage.locator('.game-item').first().waitFor();
    console.log('passed: failed game-data response and retry');
    await failureContext.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });

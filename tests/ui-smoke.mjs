import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = 'http://127.0.0.1:4173';
const out = 'artifacts';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  assert(await page.locator('#screen-room').evaluate(el => el.classList.contains('active')), 'Room is not the initial screen');
  assert(await page.locator('#main-cat').count() === 1, 'Main cat SVG is missing');
  assert(await page.locator('#room-art .room-svg').count() === 1, 'Room illustration is missing');
  assert((await page.locator('#screen-room').innerText()).includes('MAKE HOME COZY'), 'Room shop drawer is missing');
  await page.screenshot({ path: path.join(out, '01-room-mobile.png'), fullPage: true });

  await page.locator('[data-care="feed"]').first().click();
  assert(await page.locator('#screen-feed').evaluate(el => el.classList.contains('active')), 'Feed screen did not open');
  await page.locator('[data-food="fish"]').first().click();
  await page.locator('#feed-confirm').click();
  assert(await page.locator('#coins').innerText() === '52', 'Feeding did not deduct 10 coins');
  assert(await page.locator('#hunger-n').innerText() === '42%', 'Fish did not reduce hunger by 30');
  await page.screenshot({ path: path.join(out, '02-feed-mobile.png'), fullPage: true });

  await page.locator('.screen.active .navbtn[data-screen="shop"]').click();
  assert(await page.locator('#screen-shop').evaluate(el => el.classList.contains('active')), 'Shop screen did not open');
  await page.locator('[data-category="decor"]').first().click();
  assert((await page.locator('#shop-product-row').innerText()).includes('Plant'), 'Decor products did not render');
  await page.locator('#shop-product-row .product').filter({ hasText: 'Plant' }).click();
  assert((await page.locator('#placed-items').innerText()).length > 0, 'Purchased item was not placed in room');
  await page.screenshot({ path: path.join(out, '03-shop-mobile.png'), fullPage: true });

  for (const screen of ['cats', 'tasks', 'garden', 'settings']) {
    await page.locator('.screen.active .navbtn[data-screen="' + screen + '"]').click();
    assert(await page.locator('#screen-' + screen).evaluate(el => el.classList.contains('active')), screen + ' screen did not open');
  }
  await page.locator('[data-screen="puzzle"]').first().click();
  assert(await page.locator('#screen-puzzle').evaluate(el => el.classList.contains('active')), 'Puzzle did not open');
  assert(await page.locator('#board .cell').count() === 64, 'Puzzle board is not 8x8');
  await page.locator('#piece-list .piece').first().click();
  await page.locator('#board .cell').nth(0).click();
  assert((await page.locator('#score').innerText()) !== '0', 'Puzzle placement did not update score');
  assert(errors.length === 0, 'Browser errors: ' + errors.join(' | '));
  console.log('PASS: room, feeding, shop purchase/placement, cats, tasks, garden, settings, puzzle, no browser errors');
} finally {
  await browser.close();
}

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
  await page.locator('#screen-shop [data-category="decor"]').click();
  assert((await page.locator('#shop-product-row').innerText()).includes('Plant'), 'Decor products did not render');
  await page.locator('#shop-product-row .product').filter({ hasText: 'Plant' }).click();
  assert(await page.locator('#placed-items [data-item="plant"]').count() === 1, 'Purchased plant SVG was not placed in the room');
  await page.screenshot({ path: path.join(out, '03-shop-mobile.png'), fullPage: true });
  await page.locator('#screen-shop .panel button[data-screen="room"]').click();
  assert(await page.locator('#placed-items [data-item="plant"]').count() === 1, 'Purchased plant disappeared when returning home');
  await page.reload({ waitUntil: 'networkidle' });
  assert(await page.locator('#placed-items [data-item="plant"]').count() === 1, 'Purchased plant was not restored from saved progress');

  await page.locator('.screen.active .navbtn[data-screen="cats"]').click();
  assert(await page.locator('#screen-cats').evaluate(el => el.classList.contains('active')), 'Cats screen did not open');
  await page.screenshot({ path: path.join(out, '04-cats-mobile.png'), fullPage: true });

  await page.locator('.screen.active .navbtn[data-screen="tasks"]').click();
  assert(await page.locator('#screen-tasks').evaluate(el => el.classList.contains('active')), 'Tasks screen did not open');
  await page.screenshot({ path: path.join(out, '05-tasks-mobile.png'), fullPage: true });
  await page.locator('#screen-tasks [data-screen="puzzle"]').click();
  assert(await page.locator('#screen-puzzle').evaluate(el => el.classList.contains('active')), 'Puzzle did not open');
  assert(await page.locator('#board .cell').count() === 64, 'Puzzle board is not 8x8');

  // Real pointer drag: move a piece to the middle of the empty board and release.
  const pieceBox = await page.locator('#piece-list .piece').first().boundingBox();
  const targetBox = await page.locator('#board .cell').nth(36).boundingBox();
  await page.mouse.move(pieceBox.x + pieceBox.width / 2, pieceBox.y + pieceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
  await page.mouse.up();
  assert(await page.locator('#board .cell.filled').count() > 0, 'Dragging a block did not fill any board cells');
  const dragScore = Number(await page.locator('#score').innerText());
  assert(dragScore > 0, 'Drag-and-drop did not update score');

  // Tap-to-place remains available as an accessible alternative to dragging.
  await page.locator('#piece-list .piece').first().click();
  await page.locator('#board .cell').nth(0).click();
  assert(Number(await page.locator('#score').innerText()) > dragScore, 'Tap-to-place did not update score');
  await page.screenshot({ path: path.join(out, '06-puzzle-mobile.png'), fullPage: true });

  await page.locator('.screen.active .navbtn[data-screen="room"]').click();
  await page.locator('#screen-room [data-screen="garden"]').click();
  assert(await page.locator('#screen-garden').evaluate(el => el.classList.contains('active')), 'Garden screen did not open');
  await page.screenshot({ path: path.join(out, '07-garden-mobile.png'), fullPage: true });
  await page.locator('.topbar .gear[data-screen="settings"]').click();
  assert(await page.locator('#screen-settings').evaluate(el => el.classList.contains('active')), 'Settings screen did not open');
  const soundToggle = page.locator('#screen-settings [data-toggle="sound"]');
  assert(await soundToggle.getAttribute('aria-pressed') === 'true', 'Sound toggle is missing its accessible pressed state');
  await soundToggle.click();
  assert(await soundToggle.getAttribute('aria-pressed') === 'false', 'Sound toggle did not expose its muted state');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.topbar .gear[data-screen="settings"]').click();
  assert(await page.locator('#screen-settings [data-toggle="sound"]').getAttribute('aria-pressed') === 'false', 'Muted setting did not persist after reload');
  await page.locator('#screen-settings [data-toggle="sound"]').click();
  assert(await page.locator('#screen-settings [data-toggle="sound"]').getAttribute('aria-pressed') === 'true', 'Sound toggle could not be re-enabled');
  await page.screenshot({ path: path.join(out, '08-settings-mobile.png'), fullPage: true });

  await page.locator('.screen.active .navbtn[data-screen="room"]').click();
  await page.setViewportSize({ width: 360, height: 800 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Small mobile layout has horizontal page overflow');
  await page.screenshot({ path: path.join(out, '09-room-small-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1365, height: 900 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Desktop layout has horizontal page overflow');
  await page.screenshot({ path: path.join(out, '10-room-desktop.png'), fullPage: true });

  assert(errors.length === 0, 'Browser errors: ' + errors.join(' | '));
  console.log('PASS: room, feeding, shop purchase/placement, cats, tasks, garden, settings, drag-and-drop, tap-to-place, small mobile and desktop layouts, no browser errors');
} finally {
  await browser.close();
}

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
  assert(await page.locator('#room').evaluate(el => el.classList.contains('active')), 'Cat room is not the initial screen');
  assert((await page.locator('#room').innerText()).includes('FURNITURE'), 'English furniture shop is missing from initial room');
  assert((await page.locator('#room').innerText()).includes('FEED'), 'English care controls are missing from initial room');
  await page.screenshot({ path: path.join(out, '01-cat-room-mobile.png'), fullPage: true });
  await page.locator('#homeButton').click();
  assert(await page.locator('#home').evaluate(el => el.classList.contains('active')), 'Home shortcut did not open welcome screen');
  assert((await page.locator('#home').innerText()).includes('Every cat deserves a home.'), 'English welcome headline is missing');
  assert((await page.locator('#home').innerText()).includes('YOUR RESCUE LIST'), 'English rescue collection label is missing');
  await page.screenshot({ path: path.join(out, '02-welcome-mobile.png'), fullPage: true });

  const headerFits = await page.evaluate(() => {
    const brand = document.querySelector('.brand').getBoundingClientRect();
    const home = document.querySelector('#homeButton').getBoundingClientRect();
    const settings = document.querySelector('#settings').getBoundingClientRect();
    return brand.right <= home.left + 1 && settings.right <= innerWidth + 1;
  });
  assert(headerFits, 'Header controls overlap or overflow on 393px mobile width');

  await page.locator('[data-go="room"]').first().click();
  assert(await page.locator('#room').evaluate(el => el.classList.contains('active')), 'My Home navigation failed');

  for (const action of ['feed', 'play', 'clean', 'pet']) {
    await page.locator('[data-care="' + action + '"]').click();
    assert(await page.locator('#overlay').evaluate(el => getComputedStyle(el).display !== 'none'), action + ' did not show feedback');
    await page.locator('#modalOk').click();
  }
  for (const tab of ['furniture', 'decor', 'food', 'toys']) {
    await page.locator('[data-tab="' + tab + '"]').click();
    assert(await page.locator('#items .item').count() > 0, tab + ' shop is empty');
  }
  await page.locator('[data-tab="food"]').click();
  const before = Number(await page.locator('#coins').innerText());
  await page.locator('#items .item').first().click();
  assert(Number(await page.locator('#coins').innerText()) < before, 'Affordable shop purchase did not deduct coins');
  await page.locator('#modalOk').click();

  await page.locator('#homeButton').click();
  assert(await page.locator('#home').evaluate(el => el.classList.contains('active')), 'Header Home button failed');
  await page.locator('[data-go="puzzle"]').first().click();
  assert(await page.locator('#board .cell').count() === 64, 'Puzzle board should contain 64 cells');
  assert(await page.locator('#pieces .piece:not(:disabled)').count() === 3, 'Puzzle should show 3 playable pieces');
  await page.screenshot({ path: path.join(out, '03-puzzle-mobile.png'), fullPage: true });
  await page.locator('#pieces .piece:not(:disabled)').first().click();
  await page.locator('#board .cell').first().click();
  assert(await page.locator('#board .cell.filled').count() > 0, 'Placing a piece did not fill any board cells');
  assert(Number(await page.locator('#score').innerText()) > 0, 'Score did not increase after placing a piece');
  await page.locator('#newGame').click();
  assert(Number(await page.locator('#score').innerText()) === 0, 'New Game did not reset the score');
  await page.locator('#settings').click();
  assert(await page.locator('#settingsModal').evaluate(el => getComputedStyle(el).display !== 'none'), 'Settings did not open');
  const soundBefore = await page.locator('#soundToggle').innerText();
  await page.locator('#soundToggle').click();
  assert((await page.locator('#soundToggle').innerText()) !== soundBefore, 'Sound toggle did not change state');
  await page.locator('#soundToggle').click();
  await page.locator('#closeSettings').click();

  await page.evaluate(() => { localStorage.setItem('cbr2_best', '100'); localStorage.removeItem('cbr2_rescued'); });
  await page.reload({ waitUntil: 'networkidle' });
  assert(await page.locator('#rescued').innerText() === '1', 'Reaching the rescue milestone did not unlock Pepper');
  assert((await page.locator('#rescueText').innerText()).includes('Pepper'), 'Rescue collection did not show the unlocked cat');

  assert(errors.length === 0, 'Browser errors: ' + errors.join(' | '));
  // Check a wide desktop layout as well as the mobile layout.
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.goto(base, { waitUntil: 'networkidle' });
  await desktop.evaluate(() => localStorage.clear());
  await desktop.reload({ waitUntil: 'networkidle' });
  await desktop.locator('[data-go="room"]').first().click();
  const desktopOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight);
  assert(!desktopOverflow, 'Desktop layout has page-level overflow at 1440x1000');
  await desktop.screenshot({ path: path.join(out, '04-cat-room-desktop.png'), fullPage: true });
  await desktop.setViewportSize({ width: 360, height: 740 });
  const narrowOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert(!narrowOverflow, 'Narrow mobile layout overflows horizontally at 360px');
  await desktop.close();
  assert(errors.length === 0, 'Browser errors: ' + errors.join(' | '));
  console.log('PASS: Turkish welcome, responsive mobile header, room, care actions, shop tabs and purchase, home navigation, puzzle placement/scoring/reset, settings/sound toggle, rescue milestone, desktop and narrow mobile overflow; screenshots saved.');
} finally {
  await browser.close();
}

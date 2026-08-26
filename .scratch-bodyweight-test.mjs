import { chromium } from 'playwright';
const APP = 'http://localhost:8080';
const SCRATCH = '/private/tmp/claude-501/-Users-mattiacinelli-repos-workout-buddy-flow/64d7a60d-77ab-4ac0-a11e-624857f98f58/scratchpad';
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(String(err)));

await page.goto(APP + '/progress', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Body Weight', { timeout: 15000 });
await page.screenshot({ path: SCRATCH + '/bw-01-empty.png' });

console.log('--- log an entry ---');
await page.fill('#bw-weight', '80.5');
await page.fill('#bw-notes', 'morning weigh-in');
await page.click('button:has-text("Log")');
await page.waitForTimeout(600);
const afterFirst = await page.locator('text=Latest:').innerText();
console.log('RESULT after_first_log=' + JSON.stringify(afterFirst));

console.log('--- log a second entry on a different date ---');
await page.fill('#bw-date', '2026-08-20');
await page.fill('#bw-weight', '79.8');
await page.click('button:has-text("Log")');
await page.waitForTimeout(600);
await page.screenshot({ path: SCRATCH + '/bw-02-two-entries.png' });

const listItems = await page.locator('li:has-text("kg")').count();
console.log('RESULT list_items=' + listItems);

console.log('--- reload, confirm persisted ---');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Body Weight', { timeout: 10000 });
const persistedItems = await page.locator('li:has-text("kg")').count();
console.log('RESULT persisted_items=' + persistedItems);

console.log('RESULT console_errors=' + JSON.stringify(errors));
await browser.close();

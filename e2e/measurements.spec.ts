import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from '../playwright-fixture';

// "My Records": things the user measures themselves (a toe-touch gap, a
// plank hold). Driven through the real UI, real IndexedDB, and — for the
// sync test — the throwaway server booted by playwright.config.ts.

const SERVER_URL = 'http://127.0.0.1:3999';
const EMAIL = 'e2e@test.local';
const PASSWORD = 'e2e-password-123';

const createRecord = async (page: Page, name: string, value: string) => {
  await page.getByRole('button', { name: 'New record' }).click();
  const dialog = page.getByRole('dialog', { name: 'New record' });
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel(/Description/).fill('Seated, legs straight, gap between fingertips and toes');
  await dialog.getByLabel('Value', { exact: true }).fill(value);
  await dialog.getByRole('button', { name: 'Save record' }).click();
  await expect(dialog).toBeHidden();
};

test('log a toe-touch gap, improve on it, and keep it after a reload', async ({ page }) => {
  await page.goto('/progress');
  await expect(page.getByText('No records yet')).toBeVisible();

  await createRecord(page, 'Toe touch', '12.5');
  const row = page.getByRole('button', { name: /Toe touch/ });
  await expect(row).toContainText('12.5 cm');

  // A smaller gap is an improvement for a length, so it is the new best.
  await row.click();
  const detail = page.getByRole('dialog', { name: 'Toe touch' });
  await detail.getByLabel('Value', { exact: true }).fill('-2');
  await detail.getByRole('button', { name: 'Log', exact: true }).click();
  await expect(detail.getByText('14.5 cm better than last time')).toBeVisible();
  await expect(detail.getByText('New best')).toBeVisible();
  await expect(detail.getByRole('list', { name: 'Logged values' }).getByRole('listitem')).toHaveCount(2);

  // The dialog passes the accessibility audit.
  const audit = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations, audit.violations.map(v => `${v.id}: ${v.help}`).join('\n')).toEqual([]);

  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('button', { name: /Toe touch/ })).toContainText('-2 cm');
});

test('the new-record form is accessible and validates its input', async ({ page }) => {
  await page.goto('/progress');
  await page.getByRole('button', { name: 'New record' }).click();
  const dialog = page.getByRole('dialog', { name: 'New record' });
  await dialog.getByLabel('Name').fill('Plank');
  await dialog.getByLabel('Value', { exact: true }).fill('lots');
  await dialog.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByText(/Enter a valid value/)).toBeVisible();
  await expect(dialog).toBeVisible(); // nothing was saved, nothing closed

  const audit = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations, audit.violations.map(v => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
});

test('a record logged on one device reaches another through the sync server', async ({ browser }) => {
  const name = `Sync toe touch ${Date.now()}`;
  const contexts = [await browser.newContext(), await browser.newContext()];
  for (const context of contexts) {
    await context.addInitScript(() => {
      try { localStorage.setItem('workout-buddy-onboarded', '1'); } catch { /* storage off */ }
    });
  }
  const [deviceA, deviceB] = await Promise.all(contexts.map(context => context.newPage()));

  const connect = async (page: Page) => {
    await page.goto('/settings');
    await page.getByLabel('Server URL').fill(SERVER_URL);
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Connect server' }).click();
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  };

  await connect(deviceA);
  await deviceA.goto('/progress');
  await createRecord(deviceA, name, '20');
  await deviceA.goto('/settings');
  await deviceA.getByRole('button', { name: 'Sync now' }).click();
  await expect(deviceA.getByText(/Last synced/)).toBeVisible();

  await connect(deviceB);
  await deviceB.getByRole('button', { name: 'Sync now' }).click();
  await expect(deviceB.getByText(/Last synced/)).toBeVisible();
  await deviceB.goto('/progress');
  await expect(deviceB.getByRole('button', { name: new RegExp(name) })).toContainText('20 cm');

  // Device B logs an improvement, syncs; device A learns of it.
  await deviceB.getByRole('button', { name: new RegExp(name) }).click();
  await deviceB.getByRole('dialog', { name }).getByLabel('Value', { exact: true }).fill('9');
  await deviceB.getByRole('dialog', { name }).getByRole('button', { name: 'Log', exact: true }).click();
  await expect(deviceB.getByText('Value logged')).toBeVisible(); // saved locally before we navigate away
  await deviceB.keyboard.press('Escape');
  await deviceB.goto('/settings');
  await deviceB.getByRole('button', { name: 'Sync now' }).click();
  await expect(deviceB.getByText(/Last synced/)).toBeVisible();

  await deviceA.goto('/settings');
  await deviceA.getByRole('button', { name: 'Sync now' }).click();
  await expect(deviceA.getByText(/Last synced/)).toBeVisible();
  await deviceA.goto('/progress');
  await expect(deviceA.getByRole('button', { name: new RegExp(name) })).toContainText('9 cm');

  await Promise.all(contexts.map(context => context.close()));
});

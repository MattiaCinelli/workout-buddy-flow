import { test, expect } from '../playwright-fixture';
import type { Page } from '@playwright/test';

// Drives the real sync UI against the throwaway server booted by
// playwright.config.ts (e2e/support/sync-server.mjs). This is the only
// coverage that exercises a genuine cross-origin fetch + CORS preflight +
// auth + sync round-trip — the in-process server unit tests (app.inject)
// never go through a real HTTP request, so a whole class of bug (the CORS
// ones documented in docs/self-hosted-sync.md) is invisible to them.

// Must match e2e/support/sync-server.mjs.
const SERVER_URL = 'http://127.0.0.1:3999';
const EMAIL = 'e2e@test.local';
const PASSWORD = 'e2e-password-123';

// These tests share one server account; run them in order so one can't
// connect while another is mid-sync on the same account.
test.describe.configure({ mode: 'serial' });

const connect = async (page: Page) => {
  await page.goto('/settings');
  await page.getByLabel('Server URL').fill(SERVER_URL);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Connect server' }).click();
  await expect(page.getByText('Connected', { exact: true })).toBeVisible();
};

test('connect, sync, exercise the sync controls, disconnect', async ({ page }) => {
  await connect(page);

  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText(/Last synced/)).toBeVisible();

  // One-way overrides are present under their disclosure.
  await page.getByRole('button', { name: 'One-way sync' }).click();
  await expect(page.getByRole('button', { name: 'Push this device to server' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replace this device with server' })).toBeVisible();

  // Account controls only render once connected.
  await expect(page.getByRole('button', { name: 'Sign out other devices' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete account' })).toBeVisible();

  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.getByRole('button', { name: 'Connect server' })).toBeVisible();
});

test('a preference set on one device is pulled onto another through the server', async ({ browser }) => {
  const deviceA = await browser.newContext();
  const deviceB = await browser.newContext();
  for (const context of [deviceA, deviceB]) {
    await context.addInitScript(() => {
      try { localStorage.setItem('workout-buddy-onboarded', '1'); } catch { /* storage off */ }
    });
  }

  const pageA = await deviceA.newPage();
  await connect(pageA);
  await pageA.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(pageA.locator('html')).toHaveClass(/dark/);
  await pageA.getByRole('button', { name: 'Sync now' }).click();
  await expect(pageA.getByText(/Last synced/)).toBeVisible();

  // Device B starts on the default (light) theme and only learns "dark"
  // from the server.
  const pageB = await deviceB.newPage();
  await connect(pageB);
  await expect(pageB.locator('html')).not.toHaveClass(/dark/);
  await pageB.getByRole('button', { name: 'Sync now' }).click();
  await expect(pageB.locator('html')).toHaveClass(/dark/);

  await deviceA.close();
  await deviceB.close();
});

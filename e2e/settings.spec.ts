import { test, expect } from '../playwright-fixture';

test('settings page exposes device and account controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sync' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reminders' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Data and backup' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Color theme' }).getByRole('button', { name: 'System' }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Export backup' })).toBeVisible();
});

test('appearance preference is applied and retained', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Dark', exact: true }).click();

  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

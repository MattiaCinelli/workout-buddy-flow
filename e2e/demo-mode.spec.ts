import { test, expect } from '../playwright-fixture';

test('demo mode swaps in sample data and restores the real library on exit', async ({ page }) => {
  await page.goto('/exercises');
  await expect(page.getByText('Bench Press', { exact: true }).first()).toBeVisible();

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Start demo mode' }).click();
  await page.getByRole('button', { name: 'Start demo' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('status').filter({ hasText: 'Demo mode' })).toBeVisible();

  await page.goto('/exercises');
  await expect(page.getByText('Dumbbell Curl').first()).toBeVisible();
  await expect(page.getByText('Bench Press', { exact: true })).toHaveCount(0);

  await page.goto('/workouts');
  await expect(page.getByText('Quick Full-Body').first()).toBeVisible();

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Sync' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Data and backup' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Exit demo mode' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('status').filter({ hasText: 'Demo mode' })).toHaveCount(0);
  await page.goto('/exercises');
  await expect(page.getByText('Bench Press', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Dumbbell Curl')).toHaveCount(0);
});

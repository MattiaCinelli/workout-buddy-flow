import { test, expect } from '../playwright-fixture';

test('exercise library combines type and level filters and remembers tile view', async ({ page }) => {
  await page.goto('/exercises');

  await page.getByLabel('Filter by exercise type').click();
  await page.getByRole('option', { name: 'Cardio', exact: true }).click();
  await page.getByLabel('Filter by difficulty level').click();
  await page.getByRole('option', { name: 'Beginner', exact: true }).click();

  await expect(page.getByText('Running', { exact: true })).toBeVisible();
  await expect(page.getByText('Barbell Squat', { exact: true })).toHaveCount(0);

  await page.getByRole('radio', { name: 'Compact tile view' }).click();
  await expect(page.getByRole('button', { name: 'View Running' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Running' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Compact tile view' })).toBeChecked();
});

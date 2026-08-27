import { test, expect } from '../playwright-fixture';

test('course builder exposes structured program fields', async ({ page }) => {
  await page.goto('/courses');
  await page.getByRole('button', { name: /create your first course|create course/i }).first().click();

  await expect(page.getByLabel('Course Title')).toBeVisible();
  await expect(page.getByText('Program schedule')).toBeVisible();
  await expect(page.getByLabel('Goal')).toBeVisible();
  await expect(page.getByLabel('Difficulty')).toBeVisible();
  await expect(page.getByText('Add sessions across a range', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rest' })).toBeVisible();
  // The app ships with starter workouts, so a session can be added right away.
  await expect(page.getByRole('button', { name: 'Single' })).toBeEnabled();
});

test('empty course cannot be created', async ({ page }) => {
  await page.goto('/courses');
  await page.getByRole('button', { name: /create your first course|create course/i }).first().click();
  await page.getByLabel('Course Title').fill('Test program');
  await page.getByRole('button', { name: 'Create Course' }).click();
  await expect(page.getByText('Please add at least one workout session')).toBeVisible();
});

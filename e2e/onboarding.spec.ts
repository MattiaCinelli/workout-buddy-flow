// Uses the raw Playwright test, not ../playwright-fixture (which pre-marks
// the intro as seen for every other spec).
import { test, expect } from '@playwright/test';

test('first-run intro shows once, then stays dismissed', async ({ page }) => {
  await page.goto('/');

  const heading = page.getByRole('heading', { name: 'Welcome to Workout Buddy' });
  await expect(heading).toBeVisible();

  await page.getByRole('button', { name: 'Explore on my own' }).click();
  await expect(heading).toBeHidden();

  await page.reload();
  await expect(heading).toBeHidden();
});

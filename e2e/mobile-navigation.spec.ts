import { test, expect } from '../playwright-fixture';

// The phone navigation drawer, tested in a real browser: overlay dismissal is
// tied to browser history, whose timing jsdom does not reproduce.
test.use({ viewport: { width: 390, height: 844 } });

test('Reminders opens from the phone drawer and stays open', async ({ page }) => {
  await page.goto('/workouts');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /reminders/i }).click();

  const reminders = page.getByRole('dialog', { name: 'Reminders' });
  await expect(reminders).toBeVisible();
  // It used to open and then close itself a moment later.
  await page.waitForTimeout(800);
  await expect(reminders).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/workouts');
});

test('the phone Back button closes the Reminders dialog first, without leaving the page', async ({ page }) => {
  await page.goto('/workouts');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /reminders/i }).click();
  const reminders = page.getByRole('dialog', { name: 'Reminders' });
  await expect(reminders).toBeVisible();
  await page.waitForTimeout(500);

  await page.goBack();
  await expect(reminders).toBeHidden();
  expect(new URL(page.url()).pathname).toBe('/workouts');
});

test('the drawer navigates, and closing it leaves no stray history entry behind', async ({ page }) => {
  await page.goto('/workouts');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.goBack();
  await expect(page).toHaveURL(/\/workouts$/); // one Back returns to the previous page
});

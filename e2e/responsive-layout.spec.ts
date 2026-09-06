import { test, expect } from '../playwright-fixture';

const primaryRoutes = ['/', '/exercises', '/workouts', '/calendar', '/history', '/progress', '/courses', '/settings'];

const expectNoPageOverflow = async (page: import('@playwright/test').Page) => {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

test('primary pages fit phone and desktop widths', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const route of primaryRoutes) {
      await page.goto(route);
      await expectNoPageOverflow(page);
    }
  }
});

test('large creation dialogs stay inside a phone viewport and notices appear at the bottom', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });

  await page.goto('/workouts');
  await page.getByRole('button', { name: 'Create Workout' }).click();
  const workoutDialog = page.getByRole('dialog');
  await expect(workoutDialog).toBeVisible();
  const workoutBox = await workoutDialog.boundingBox();
  expect(workoutBox).not.toBeNull();
  expect(workoutBox!.x).toBeGreaterThanOrEqual(0);
  expect(workoutBox!.x + workoutBox!.width).toBeLessThanOrEqual(320);
  expect(workoutBox!.y).toBeGreaterThanOrEqual(0);
  expect(workoutBox!.y + workoutBox!.height).toBeLessThanOrEqual(568);
  await page.getByRole('button', { name: 'Close' }).click();

  await page.goto('/courses');
  await page.getByRole('button', { name: /create your first course|create course/i }).first().click();
  const courseDialog = page.getByRole('dialog');
  await expect(courseDialog).toBeVisible();
  await page.getByLabel('Course Title').fill('Responsive course');
  await page.getByRole('button', { name: 'Create Course' }).click();
  const notice = page.getByText('Please add at least one workout session');
  await expect(notice).toBeVisible();
  const noticeBox = await notice.boundingBox();
  expect(noticeBox).not.toBeNull();
  expect(noticeBox!.y).toBeGreaterThan(568 / 2);
  await expectNoPageOverflow(page);
});

import { test, expect } from '../playwright-fixture';

test('phone navigation reaches settings and accessibility preferences apply', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Accessibility' })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  await page.getByRole('button', { name: 'Large', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/text-size-large/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('guided workout controls remain reachable on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('workout-buddy-db');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('workouts', 'readwrite');
      tx.objectStore('workouts').put({
        id: 'mobile-test', date: new Date().toISOString(), title: 'Phone Test', duration: 1,
        category: 'strength', sets: [{ exerciseId: '1', reps: 2, restAfter: 5 }],
      });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto('/workouts/mobile-test/session');

  await expect(page.getByRole('navigation', { name: 'Workout controls' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.getByRole('button', { name: /ready|next/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

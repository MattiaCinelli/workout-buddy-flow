import type { Page } from '@playwright/test';
import { test, expect } from '../playwright-fixture';

// A workout done without being scheduled must still appear on its day.

const seed = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const at = (offsetDays: number, hour: number) => {
      const d = new Date(); d.setDate(d.getDate() + offsetDays); d.setHours(hour, 0, 0, 0); return d;
    };
    const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const session = (id: string, title: string, when: Date, extra: Record<string, unknown> = {}) => ({
      id, workoutId: `template-${id}`, title, date: when.toISOString(), completedAt: when.toISOString(),
      duration: 30, plannedDuration: 30, category: 'strength', sets: [], ...extra,
    });
    const today = at(0, 10);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('workout-buddy-db');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['workouts', 'scheduledWorkouts', 'workoutSessions'], 'readwrite');
      // A planned workout today that was also completed.
      tx.objectStore('workouts').put({ id: 'template-planned', date: today.toISOString(), title: 'Planned Push Day', duration: 30, category: 'strength', sets: [] });
      tx.objectStore('scheduledWorkouts').put({ id: 'sched-planned', workoutId: 'template-planned', startDate: day(today), startTime: '09:00', recurrence: 'none', createdAt: today.toISOString() });
      tx.objectStore('workoutSessions').put(session('planned', 'Planned Push Day', today, { workoutId: 'template-planned', scheduledWorkoutId: 'sched-planned', scheduledDate: day(today) }));
      // Not on the calendar at all, done today (and late enough to be near midnight in UTC+ zones).
      tx.objectStore('workoutSessions').put(session('freestyle', 'Unplanned Mobility', at(0, 18)));
      // Done on another day: must not show on today's history filter.
      tx.objectStore('workoutSessions').put(session('older', 'Unplanned Yesterday', at(-1, 8)));
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
};

test('a workout done without being scheduled appears on the calendar day it was done', async ({ page }) => {
  await seed(page);
  await page.goto('/calendar');

  const unplanned = page.getByRole('button', { name: 'Unplanned Mobility, done, not scheduled' });
  await expect(unplanned).toBeVisible();
  await expect(unplanned).toContainText('18:00');

  // The planned one is shown once, marked done, and is not repeated as "unplanned".
  await expect(page.getByRole('button', { name: 'Planned Push Day, done' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Planned Push Day, done, not scheduled/ })).toHaveCount(0);
});

test('the month view lists it too, and tapping it opens that day in History', async ({ page }) => {
  await seed(page);
  await page.goto('/calendar');
  await page.getByRole('tab', { name: 'Month' }).click();

  const unplanned = page.getByRole('button', { name: 'Unplanned Mobility, done, not scheduled' });
  await expect(unplanned).toBeVisible();
  await unplanned.click();

  await expect(page).toHaveURL(/\/history\?date=\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByText('Unplanned Mobility').first()).toBeVisible();
  // Only that day: yesterday's workout is filtered out.
  await expect(page.getByText('Unplanned Yesterday')).toHaveCount(0);
});

test('History without a date shows everything, and a malformed date is ignored', async ({ page }) => {
  await seed(page);
  await page.goto('/history');
  await expect(page.getByText('Unplanned Yesterday').first()).toBeVisible();

  await page.goto('/history?date=not-a-date');
  await expect(page.getByText('Unplanned Yesterday').first()).toBeVisible();
  await expect(page.getByText('Unplanned Mobility').first()).toBeVisible();
});

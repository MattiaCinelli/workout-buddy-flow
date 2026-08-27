import { test, expect } from '../playwright-fixture';

test('a history record can be corrected after completion', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('workout-buddy-db');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('workoutSessions', 'readwrite');
      tx.objectStore('workoutSessions').put({
        id: 'session-correction', workoutId: 'template-1', title: 'Correction Test',
        date: '2026-08-20T10:00:00.000Z', completedAt: '2026-08-20T10:00:00.000Z',
        duration: 30, plannedDuration: 30, category: 'strength', sets: [],
        perceivedExertion: 5, completionNotes: 'Before',
      });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto('/history');

  await page.getByRole('button', { name: 'Correct history record' }).click();
  await page.getByLabel('Duration (minutes)').fill('42');
  await page.getByLabel('Perceived exertion (1–10)').fill('7');
  await page.getByLabel('Session notes').fill('Corrected');
  await page.getByRole('button', { name: 'Save corrections' }).click();

  await expect(page.getByText('RPE 7/10')).toBeVisible();
  await expect(page.getByRole('link', { name: /Correction Test/ }).getByText('Corrected', { exact: true })).toBeVisible();
  await expect(page.getByText('42 min')).toBeVisible();
});

test('a calendar occurrence can be skipped and restored', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const localDate = new Date();
    const date = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('workout-buddy-db');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['workouts', 'scheduledWorkouts'], 'readwrite');
      tx.objectStore('workouts').put({ id: 'recovery-workout', date: new Date().toISOString(),
        title: 'Recovery Schedule', duration: 20, category: 'strength', sets: [] });
      tx.objectStore('scheduledWorkouts').put({ id: 'recovery-schedule', workoutId: 'recovery-workout',
        startDate: date, startTime: '09:00', recurrence: 'none', createdAt: new Date().toISOString() });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto('/calendar');

  await page.getByRole('button', { name: 'Recovery Schedule' }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Recovery Schedule, skipped' }).click();
  await expect(page.getByText('Skipped', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Unskip', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Recovery Schedule' })).toBeVisible();
});

import { test, expect } from '../playwright-fixture';
import { parseBackup } from '../src/lib/backup';

test('backup parser accepts the current format', () => {
  const backup = parseBackup(JSON.stringify({
    format: 'workout-buddy-backup', version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
    data: { exercises: [], workouts: [], workoutSessions: [], scheduledWorkouts: [], courses: [] }
  }));
  expect(backup.version).toBe(1);
});

test('backup parser rejects incomplete files before restore', () => {
  expect(() => parseBackup(JSON.stringify({ format: 'workout-buddy-backup', version: 1, data: {} })))
    .toThrow(/missing exercises/i);
});

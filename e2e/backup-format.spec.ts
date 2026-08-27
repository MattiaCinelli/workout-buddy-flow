import { test, expect } from '../playwright-fixture';
import { parseBackup } from '../src/lib/backup';

test('backup parser accepts the current format', () => {
  const backup = parseBackup(JSON.stringify({
    format: 'workout-buddy-backup', version: 2, exportedAt: '2026-01-01T00:00:00.000Z',
    data: {
      exercises: [], workouts: [], workoutSessions: [], scheduledWorkouts: [], courses: [],
      muscleGroups: [], bodyMetrics: [],
    }
  }));
  expect(backup.version).toBe(2);
});

test('backup parser still accepts legacy version-1 files', () => {
  const backup = parseBackup(JSON.stringify({
    format: 'workout-buddy-backup', version: 1, exportedAt: '2025-01-01T00:00:00.000Z',
    data: { exercises: [], workouts: [], workoutSessions: [], scheduledWorkouts: [], courses: [] },
  }));
  expect(backup.version).toBe(1);
});

test('backup parser rejects incomplete current files before restore', () => {
  expect(() => parseBackup(JSON.stringify({
    format: 'workout-buddy-backup', version: 2,
    data: { exercises: [], workouts: [], workoutSessions: [], scheduledWorkouts: [], courses: [] },
  })))
    .toThrow(/missing muscleGroups/i);

  expect(() => parseBackup(JSON.stringify({ format: 'workout-buddy-backup', version: 1, data: {} })))
    .toThrow(/missing exercises/i);
});

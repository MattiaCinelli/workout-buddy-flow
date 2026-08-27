/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getDB,
  getAllExercisesFromDB, saveExerciseToDB, deleteExerciseFromDB, bulkSaveExercisesToDB, getExerciseByIdFromDB,
  getAllWorkoutsFromDB, saveWorkoutToDB, bulkSaveWorkoutsToDB,
  getAllWorkoutSessionsFromDB, saveWorkoutSessionToDB, deleteAllWorkoutSessionsFromDB,
  getAllBodyMetricsFromDB, saveBodyMetricToDB, deleteBodyMetricFromDB,
} from './db';
import type { Exercise } from '@/data/exercises';

const ex = (over: Partial<Exercise>): Exercise => ({
  id: 'e1', name: 'Squat', category: 'strength', muscleGroups: [], difficulty: 'beginner', ...over,
} as Exercise);

beforeEach(async () => {
  const db = await getDB();
  await Promise.all([...db.objectStoreNames].map(name => db.clear(name)));
});

describe('db CRUD wrappers', () => {
  it('save is an upsert keyed by id; getAll returns every row', async () => {
    await saveExerciseToDB(ex({ id: 'a', name: 'A' }));
    await saveExerciseToDB(ex({ id: 'b', name: 'B' }));
    await saveExerciseToDB(ex({ id: 'a', name: 'A2' })); // overwrites, not appends

    const all = await getAllExercisesFromDB();
    expect(all).toHaveLength(2);
    expect(all.find(e => e.id === 'a')?.name).toBe('A2');
  });

  it('getById returns the row or undefined', async () => {
    await saveExerciseToDB(ex({ id: 'a' }));
    expect((await getExerciseByIdFromDB('a'))?.id).toBe('a');
    expect(await getExerciseByIdFromDB('missing')).toBeUndefined();
  });

  it('delete removes a single row', async () => {
    await saveExerciseToDB(ex({ id: 'a' }));
    await saveExerciseToDB(ex({ id: 'b' }));
    await deleteExerciseFromDB('a');
    expect((await getAllExercisesFromDB()).map(e => e.id)).toEqual(['b']);
  });

  it('bulkSave writes many rows in one transaction', async () => {
    await bulkSaveExercisesToDB([ex({ id: 'a' }), ex({ id: 'b' }), ex({ id: 'c' })]);
    expect(await getAllExercisesFromDB()).toHaveLength(3);

    await bulkSaveWorkoutsToDB([{ id: 'w1', title: 'x', date: '2026-01-01', duration: 1, category: 'strength', sets: [] } as never]);
    expect(await getAllWorkoutsFromDB()).toHaveLength(1);
  });

  it('deleteAllWorkoutSessionsFromDB clears just the sessions store', async () => {
    await saveWorkoutSessionToDB({ id: 's1', completedAt: '2026-01-01T00:00:00.000Z' } as never);
    await saveWorkoutToDB({ id: 'w1', title: 'x', date: '2026-01-01', duration: 1, category: 'strength', sets: [] } as never);

    await deleteAllWorkoutSessionsFromDB();

    expect(await getAllWorkoutSessionsFromDB()).toHaveLength(0);
    expect(await getAllWorkoutsFromDB()).toHaveLength(1); // untouched
  });

  it('body metric helpers round-trip and delete', async () => {
    await saveBodyMetricToDB({ id: 'bm1', date: '2026-01-01', weight: 80 } as never);
    expect(await getAllBodyMetricsFromDB()).toHaveLength(1);
    await deleteBodyMetricFromDB('bm1');
    expect(await getAllBodyMetricsFromDB()).toHaveLength(0);
  });

  it('opens the database with all seven stores', async () => {
    const db = await getDB();
    expect([...db.objectStoreNames].sort()).toEqual([
      'bodyMetrics', 'courses', 'exercises', 'muscleGroups', 'scheduledWorkouts', 'workoutSessions', 'workouts',
    ]);
  });
});

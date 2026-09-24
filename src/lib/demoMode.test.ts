/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openDB } from 'idb';
import { buildDemoData } from '@/data/demoData';
import { defaultMuscleGroups } from '@/data/muscleGroups';
import { DEMO_DB_NAME, DEMO_MODE_KEY, demoScopedKey, isDemoMode } from './demoMode';

afterEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('demo data', () => {
  const now = new Date('2026-09-24T12:00:00');
  const data = buildDemoData(now);
  const exerciseIds = new Set(data.exercises.map(exercise => exercise.id));
  const workoutIds = new Set(data.workouts.map(workout => workout.id));

  it('only references exercises, workouts and muscle groups that exist in the demo set', () => {
    const groupIds = new Set(defaultMuscleGroups.map(group => group.id));
    data.exercises.forEach(exercise => exercise.muscleGroups.forEach(group => expect(groupIds).toContain(group)));
    [...data.workouts, ...data.workoutSessions].forEach(entry =>
      entry.sets.forEach(set => expect(exerciseIds).toContain(set.exerciseId)));
    data.workoutSessions.forEach(session => {
      expect(workoutIds).toContain(session.workoutId);
      session.actualSets?.forEach(set => expect(exerciseIds).toContain(set.exerciseId));
    });
    data.scheduledWorkouts.forEach(schedule => expect(workoutIds).toContain(schedule.workoutId));
    data.courses.flatMap(course => course.workouts).filter(item => item.type === 'workout')
      .forEach(item => expect(workoutIds).toContain(item.workoutId));
  });

  it('uses only bundled pictures, never private or remote ones', () => {
    data.exercises.forEach(exercise => {
      expect(exercise.imageUrl).toMatch(/^\/demo\/[a-z-]+\.svg$/);
      expect(existsSync(resolve(__dirname, '../../public', exercise.imageUrl!.slice(1)))).toBe(true);
    });
  });

  it('places the made-up history in the recent past', () => {
    data.workoutSessions.forEach(session => {
      const completed = new Date(session.completedAt);
      expect(completed.getTime()).toBeLessThan(now.getTime());
      expect(now.getTime() - completed.getTime()).toBeLessThan(57 * 24 * 60 * 60 * 1000);
    });
  });
});

describe('demo mode storage', () => {
  it('scopes device preferences only while demo mode is on', () => {
    expect(isDemoMode()).toBe(false);
    expect(demoScopedKey('folders')).toBe('folders');
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    expect(isDemoMode()).toBe(true);
    expect(demoScopedKey('folders')).toBe('folders:demo');
  });

  it('opens a separate, pre-seeded database and leaves the real one alone', async () => {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    const db = await import('./db');
    const exercises = await db.getAllExercisesFromDB();
    expect(exercises.map(exercise => exercise.id).sort()).toEqual(buildDemoData().exercises.map(exercise => exercise.id).sort());
    expect((await db.getAllWorkoutSessionsFromDB()).length).toBeGreaterThan(0);
    (await db.getDB()).close();

    const demo = await openDB(DEMO_DB_NAME);
    expect(await demo.count('exercises')).toBe(exercises.length);
    demo.close();
    expect((await indexedDB.databases()).map(info => info.name)).not.toContain('workout-buddy-db');
  });

  it('reports sync as disconnected so demo records are never pushed', async () => {
    const { isConnected } = await import('./syncClient');
    localStorage.setItem('workout-buddy-sync:serverUrl', 'https://sync.example');
    localStorage.setItem('workout-buddy-sync:token', 'token');
    const connected = isConnected();
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    expect(isConnected()).toBe(false);
    expect(connected).toBe(true);
  });
});

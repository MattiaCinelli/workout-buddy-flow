import { describe, expect, it } from 'vitest';
import { muscleGroupLoad } from './muscleGroupVolume';
import { Exercise } from '@/data/exercises';
import { WorkoutSession } from '@/data/workoutSessions';

const exercises = [
  { id: 'bench', name: 'Bench', muscleGroups: ['Chest', 'Triceps'] },
  { id: 'pushup', name: 'Push-up', muscleGroups: ['Chest'] },
  { id: 'orphan', name: 'Orphan', muscleGroups: [] },
] as Exercise[];

const session = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1', workoutId: 'w1', date: '2026-03-01T00:00:00.000Z', completedAt: '2026-03-01T00:40:00.000Z',
  title: 'Push', duration: 40, plannedDuration: 40, category: 'strength', sets: [],
  ...overrides,
});

describe('muscleGroupLoad', () => {
  it('counts each completed set toward every tagged muscle group and sums weighted volume', () => {
    const result = muscleGroupLoad([session({ actualSets: [
      { exerciseId: 'bench', setIndex: 0, completed: true, reps: 10, weight: 40 },
      { exerciseId: 'bench', setIndex: 1, completed: true, reps: 8, weight: 40 },
      { exerciseId: 'pushup', setIndex: 2, completed: true, reps: 20 },
      { exerciseId: 'bench', setIndex: 3, completed: false, reps: 0, weight: 40 },
    ] })], exercises);

    expect(result).toEqual([
      { muscleGroupId: 'Chest', sets: 3, volume: 10 * 40 + 8 * 40 },
      { muscleGroupId: 'Triceps', sets: 2, volume: 10 * 40 + 8 * 40 },
    ]);
  });

  it('ignores exercises with no muscle groups and unknown exercise ids', () => {
    const result = muscleGroupLoad([session({ actualSets: [
      { exerciseId: 'orphan', setIndex: 0, completed: true, reps: 10 },
      { exerciseId: 'ghost', setIndex: 1, completed: true, reps: 10 },
    ] })], exercises);
    expect(result).toEqual([]);
  });

  it('respects the since cutoff', () => {
    const sessions = [
      session({ id: 'old', date: '2026-01-01T00:00:00.000Z', actualSets: [{ exerciseId: 'pushup', setIndex: 0, completed: true, reps: 10 }] }),
      session({ id: 'new', date: '2026-03-01T00:00:00.000Z', actualSets: [{ exerciseId: 'pushup', setIndex: 0, completed: true, reps: 10 }] }),
    ];
    expect(muscleGroupLoad(sessions, exercises, '2026-02-01T00:00:00.000Z')).toEqual([
      { muscleGroupId: 'Chest', sets: 1, volume: 0 },
    ]);
  });
});

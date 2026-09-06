import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/data/exercises';
import { expandSetForExercise, materializeLegacyDirections } from './workoutDirections';

const exercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'row', name: 'Row', category: 'strength', muscleGroups: [], difficulty: 'beginner',
  ...overrides,
});

describe('workout directions', () => {
  it('creates a separate visible set for each exercise default direction', () => {
    const sets = expandSetForExercise(
      { exerciseId: 'row', reps: 10 },
      exercise({ executionDirections: ['left', 'right'] }),
    );

    expect(sets).toEqual([
      { exerciseId: 'row', reps: 10, direction: 'left' },
      { exerciseId: 'row', reps: 10, direction: 'right' },
    ]);
  });

  it('materializes old unilateral sets but preserves explicit workout overrides', () => {
    const oldExercise = exercise({ unilateral: true });

    expect(materializeLegacyDirections([{ exerciseId: 'row', reps: 8 }], oldExercise))
      .toHaveLength(2);
    expect(materializeLegacyDirections([
      { exerciseId: 'row', reps: 8, direction: 'forward' },
      { exerciseId: 'row', reps: 8, direction: 'none' },
    ], oldExercise)).toEqual([
      { exerciseId: 'row', reps: 8, direction: 'forward' },
      { exerciseId: 'row', reps: 8, direction: 'none' },
    ]);
  });
});

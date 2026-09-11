import { describe, expect, it } from 'vitest';
import { Exercise } from '@/data/exercises';
import { buildExerciseTrial } from '@/lib/exerciseTrial';

const exercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'stretch',
  name: 'Test Stretch',
  category: 'flexibility',
  muscleGroups: [],
  difficulty: 'beginner',
  logType: 'time',
  defaultSets: 2,
  defaultDuration: 30,
  ...overrides,
});

describe('buildExerciseTrial', () => {
  it('uses the exercise set and duration defaults without creating a stored workout', () => {
    const trial = buildExerciseTrial(exercise());

    expect(trial.id).toBe('exercise-trial:stretch');
    expect(trial.title).toBe('Try Test Stretch');
    expect(trial.sets).toEqual([
      expect.objectContaining({ exerciseId: 'stretch', duration: 30, direction: 'none' }),
      expect.objectContaining({ exerciseId: 'stretch', duration: 30, direction: 'none' }),
    ]);
  });

  it('creates every configured set for every execution direction', () => {
    const trial = buildExerciseTrial(exercise({ executionDirections: ['left', 'right'] }));

    expect(trial.sets.map(set => set.direction)).toEqual(['left', 'right', 'left', 'right']);
  });

  it('uses repetition defaults for a reps-based exercise', () => {
    const trial = buildExerciseTrial(exercise({ logType: 'reps', defaultSets: 3, defaultReps: 13 }));

    expect(trial.sets).toHaveLength(3);
    expect(trial.sets.every(set => set.reps === 13 && set.duration === undefined)).toBe(true);
  });
});

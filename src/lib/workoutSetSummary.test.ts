import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/data/exercises';
import { exerciseTargetText, summarizeSets } from './workoutSetSummary';

const exercise = (logType: 'reps' | 'time' | 'holds'): Exercise =>
  ({ id: 'e', name: 'E', category: 'strength', muscleGroups: [], difficulty: 'beginner', logType });

describe('summarizeSets', () => {
  it('collapses identical sets into one value', () => {
    expect(summarizeSets(exercise('reps'), [
      { exerciseId: 'e', reps: 10, weight: 12 }, { exerciseId: 'e', reps: 10, weight: 12 }, { exerciseId: 'e', reps: 10, weight: 12 },
    ])).toBe('3 sets · 10 reps · 12 kg');
  });

  it('shows a range when sets differ, and omits weight when none is set', () => {
    expect(summarizeSets(exercise('reps'), [{ exerciseId: 'e', reps: 8 }, { exerciseId: 'e', reps: 12 }]))
      .toBe('2 sets · 8–12 reps');
    expect(summarizeSets(exercise('reps'), [{ exerciseId: 'e', reps: 5, weight: 12.5 }, { exerciseId: 'e', reps: 5, weight: 20 }]))
      .toBe('2 sets · 5 reps · 12.5–20 kg');
  });

  it('describes timed sets in seconds', () => {
    expect(summarizeSets(exercise('time'), [{ exerciseId: 'e', duration: 30 }])).toBe('1 set · 30s');
  });
});

describe('holds', () => {
  it('summarizes holds as count × length', () => {
    expect(summarizeSets(exercise('holds'), [{ exerciseId: 'e', reps: 5, duration: 10 }, { exerciseId: 'e', reps: 5, duration: 10 }]))
      .toBe('2 sets · 5 × 10s holds');
    expect(summarizeSets(exercise('holds'), [{ exerciseId: 'e', reps: 4, duration: 10 }, { exerciseId: 'e', reps: 6, duration: 10 }]))
      .toBe('2 sets · 4–6 × 10s holds');
  });

  it('describes an exercise default target for each type', () => {
    expect(exerciseTargetText({ ...exercise('holds'), defaultReps: 5, defaultDuration: 10 })).toBe('5 holds of 10s');
    expect(exerciseTargetText({ ...exercise('reps'), defaultReps: 13 })).toBe('13 reps');
    expect(exerciseTargetText({ ...exercise('time'), defaultDuration: 30 })).toBe('30s');
    expect(exerciseTargetText(exercise('reps'))).toBeNull();
  });
});

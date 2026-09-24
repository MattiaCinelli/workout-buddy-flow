import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/data/exercises';
import { summarizeSets } from './workoutSetSummary';

const exercise = (logType: 'reps' | 'time'): Exercise =>
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

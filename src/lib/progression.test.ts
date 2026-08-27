import { describe, expect, it } from 'vitest';
import { suggestNextSet } from './progression';
import { Exercise, ExerciseProgression } from '@/data/exercises';
import { ExerciseSessionEntry } from '@/lib/exerciseHistory';

const exercise = (progression?: ExerciseProgression): Exercise => ({
  id: 'bench', name: 'Bench', category: 'strength', muscleGroups: [], difficulty: 'beginner',
  logType: 'reps', progression,
});

const entry = (sets: Array<{ reps: number; weight: number }>): ExerciseSessionEntry => ({
  sessionId: 's', date: '2026-01-01', workoutTitle: 'Push',
  sets: sets.map((s, i) => ({ exerciseId: 'bench', setIndex: i, completed: true, ...s })),
});

describe('suggestNextSet', () => {
  it('returns null without a policy, without history, or for a non-weighted set', () => {
    expect(suggestNextSet(exercise(), { reps: 5, weight: 40 }, [entry([{ reps: 5, weight: 40 }])])).toBeNull();
    expect(suggestNextSet(exercise({ mode: 'linear' }), { reps: 5, weight: 40 }, [])).toBeNull();
    expect(suggestNextSet(exercise({ mode: 'linear' }), { reps: 5 }, [entry([{ reps: 5, weight: 40 }])])).toBeNull();
  });

  describe('linear', () => {
    const ex = exercise({ mode: 'linear', incrementKg: 2.5 });

    it('adds weight when every set hit the target last time', () => {
      const s = suggestNextSet(ex, { reps: 5, weight: 60 }, [entry([{ reps: 5, weight: 60 }, { reps: 5, weight: 60 }])]);
      expect(s).toMatchObject({ weight: 62.5, reps: 5 });
      expect(s?.note).toMatch(/add 2.5 kg/);
    });

    it('repeats the weight after a single missed session', () => {
      const s = suggestNextSet(ex, { reps: 5, weight: 60 }, [entry([{ reps: 3, weight: 60 }])]);
      expect(s).toMatchObject({ weight: 60, reps: 5 });
    });

    it('deloads ~10% after two missed sessions in a row', () => {
      const missed = [entry([{ reps: 3, weight: 60 }]), entry([{ reps: 4, weight: 60 }])];
      const s = suggestNextSet(ex, { reps: 5, weight: 60 }, missed);
      expect(s?.weight).toBe(55); // 60 * 0.9 = 54 -> rounded to 2.5 step
      expect(s?.note).toMatch(/back off/);
    });
  });

  describe('double', () => {
    const ex = exercise({ mode: 'double', incrementKg: 2.5, repRangeMin: 8, repRangeMax: 12 });

    it('adds weight and resets reps once every set reached the top of the range', () => {
      const s = suggestNextSet(ex, { reps: 8, weight: 40 }, [entry([{ reps: 12, weight: 40 }, { reps: 12, weight: 40 }])]);
      expect(s).toMatchObject({ weight: 42.5, reps: 8 });
    });

    it('adds a rep while still inside the range', () => {
      const s = suggestNextSet(ex, { reps: 8, weight: 40 }, [entry([{ reps: 10, weight: 40 }, { reps: 9, weight: 40 }])]);
      expect(s).toMatchObject({ weight: 40, reps: 11 });
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  describeSetResult, exerciseSessionHistory, exerciseSessionSummaries, lastExerciseSession,
} from './exerciseHistory';
import { WorkoutSession } from '@/data/workoutSessions';

const session = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1', workoutId: 'w1', date: '2026-01-01T10:00:00.000Z', completedAt: '2026-01-01T10:00:00.000Z',
  title: 'Push Day', duration: 40, plannedDuration: 40, category: 'strength',
  sets: [{ exerciseId: 'bench', reps: 10, weight: 40 }],
  ...overrides,
});

describe('exerciseSessionHistory', () => {
  it('returns matching sessions newest-first with only that exercise\'s completed sets', () => {
    const sessions = [
      session({ id: 'a', date: '2026-01-01T10:00:00.000Z', actualSets: [
        { exerciseId: 'bench', setIndex: 0, completed: true, reps: 10, weight: 40 },
        { exerciseId: 'row', setIndex: 1, completed: true, reps: 10, weight: 30 },
      ] }),
      session({ id: 'b', date: '2026-01-08T10:00:00.000Z', actualSets: [
        { exerciseId: 'bench', setIndex: 0, completed: true, reps: 8, weight: 42 },
        { exerciseId: 'bench', setIndex: 1, completed: false, reps: 0, weight: 42 },
      ] }),
    ];
    const history = exerciseSessionHistory('bench', sessions);
    expect(history.map(entry => entry.sessionId)).toEqual(['b', 'a']);
    expect(history[0].sets).toEqual([{ exerciseId: 'bench', setIndex: 0, completed: true, reps: 8, weight: 42 }]);
    expect(history[1].sets).toHaveLength(1);
  });

  it('falls back to planned sets when a session has no actualSets', () => {
    const history = exerciseSessionHistory('bench', [session({ actualSets: undefined })]);
    expect(history[0].sets[0]).toMatchObject({ exerciseId: 'bench', reps: 10, weight: 40, completed: true });
  });

  it('excludes sessions where every set of the exercise was skipped', () => {
    const skipped = session({ actualSets: [{ exerciseId: 'bench', setIndex: 0, completed: false, reps: 0, weight: 40 }] });
    expect(exerciseSessionHistory('bench', [skipped])).toEqual([]);
  });

  it('excludes sessions that never included the exercise', () => {
    expect(exerciseSessionHistory('squat', [session()])).toEqual([]);
  });
});

describe('lastExerciseSession', () => {
  it('returns the most recent match, or null', () => {
    const sessions = [
      session({ id: 'old', date: '2026-01-01T10:00:00.000Z' }),
      session({ id: 'new', date: '2026-02-01T10:00:00.000Z' }),
    ];
    expect(lastExerciseSession('bench', sessions)?.sessionId).toBe('new');
    expect(lastExerciseSession('deadlift', sessions)).toBeNull();
  });
});

describe('exerciseSessionSummaries', () => {
  it('aggregates per session, oldest first', () => {
    const sessions = [
      session({ id: 'a', date: '2026-01-01T10:00:00.000Z', actualSets: [
        { exerciseId: 'bench', setIndex: 0, completed: true, reps: 10, weight: 40 },
        { exerciseId: 'bench', setIndex: 1, completed: true, reps: 8, weight: 45 },
      ] }),
      session({ id: 'b', date: '2026-01-08T10:00:00.000Z', actualSets: [
        { exerciseId: 'bench', setIndex: 0, completed: true, reps: 5, weight: 50 },
      ] }),
    ];
    const summaries = exerciseSessionSummaries('bench', sessions);
    expect(summaries.map(s => s.sessionId)).toEqual(['a', 'b']);
    expect(summaries[0]).toMatchObject({
      setCount: 2, topWeight: 45, totalReps: 18, totalVolume: 10 * 40 + 8 * 45,
    });
    expect(summaries[1]).toMatchObject({ setCount: 1, topWeight: 50, totalVolume: 250 });
  });

  it('tracks best duration and distance for non-weighted exercises', () => {
    const sessions = [session({ id: 'a', sets: [], actualSets: [
      { exerciseId: 'plank', setIndex: 0, completed: true, duration: 45 },
      { exerciseId: 'plank', setIndex: 1, completed: true, duration: 60 },
    ] })];
    const summary = exerciseSessionSummaries('plank', sessions)[0];
    expect(summary).toMatchObject({ bestDuration: 60 });
    expect(summary.topWeight).toBeUndefined();
  });
});

describe('describeSetResult', () => {
  it('formats each shape of a logged set', () => {
    expect(describeSetResult({ reps: 10, weight: 40 })).toBe('10 × 40 kg');
    expect(describeSetResult({ reps: 12 })).toBe('12 reps');
    expect(describeSetResult({ duration: 90 })).toBe('1:30');
    expect(describeSetResult({ duration: 45 })).toBe('45s');
    expect(describeSetResult({ distance: 3000 })).toBe('3 km');
    expect(describeSetResult({ distance: 400 })).toBe('400 m');
    expect(describeSetResult({})).toBe('—');
  });
});

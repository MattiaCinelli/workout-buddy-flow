import { describe, expect, it } from 'vitest';
import { computePersonalRecords, detectNewPersonalRecords } from './personalRecords';
import { WorkoutSession } from '@/data/workoutSessions';

const session = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's-1', workoutId: 'w-1', date: '2026-01-01', title: 'Leg day', duration: 30,
  plannedDuration: 30, category: 'strength', completedAt: '2026-01-01T00:00:00.000Z',
  sets: [{ exerciseId: 'squat', reps: 5, weight: 60 }],
  ...overrides,
});

describe('computePersonalRecords', () => {
  it('tracks the best weight, reps, duration, and distance independently per exercise', () => {
    const sessions = [
      session({ date: '2026-01-01', actualSets: [{ exerciseId: 'squat', setIndex: 0, completed: true, reps: 5, weight: 60 }] }),
      session({ id: 's-2', date: '2026-01-08', actualSets: [{ exerciseId: 'squat', setIndex: 0, completed: true, reps: 8, weight: 55 }] }),
    ];
    const records = computePersonalRecords(sessions);
    const squat = records.get('squat');
    expect(squat?.maxWeight).toEqual({ value: 60, date: '2026-01-01' });
    expect(squat?.maxReps).toEqual({ value: 8, date: '2026-01-08' });
  });

  it('ignores sets marked as not completed', () => {
    const sessions = [
      session({ actualSets: [{ exerciseId: 'squat', setIndex: 0, completed: false, weight: 100 }] }),
    ];
    const records = computePersonalRecords(sessions);
    expect(records.get('squat')).toBeUndefined();
  });

  it('falls back to the planned sets when a session has no actualSets (older history)', () => {
    const sessions = [session({ actualSets: undefined, sets: [{ exerciseId: 'squat', reps: 5, weight: 70 }] })];
    const records = computePersonalRecords(sessions);
    expect(records.get('squat')?.maxWeight?.value).toBe(70);
  });

  it('keeps different exercises fully independent', () => {
    const sessions = [
      session({ actualSets: [
        { exerciseId: 'squat', setIndex: 0, completed: true, weight: 60 },
        { exerciseId: 'plank', setIndex: 1, completed: true, duration: 45 },
      ] }),
    ];
    const records = computePersonalRecords(sessions);
    expect(records.get('squat')?.maxDuration).toBeUndefined();
    expect(records.get('plank')?.maxWeight).toBeUndefined();
    expect(records.get('plank')?.maxDuration?.value).toBe(45);
  });
});

describe('detectNewPersonalRecords', () => {
  it('reports a PR when a finished set beats the prior best', () => {
    const prior = [session({ actualSets: [{ exerciseId: 'squat', setIndex: 0, completed: true, weight: 60 }] })];
    const finished = [{ exerciseId: 'squat', setIndex: 0, completed: true, weight: 65 }];
    const prs = detectNewPersonalRecords(finished, prior);
    expect(prs).toContainEqual({ exerciseId: 'squat', kind: 'weight', value: 65, previousValue: 60 });
  });

  it('does not report a PR for the first time an exercise is ever performed', () => {
    const finished = [{ exerciseId: 'brand-new-exercise', setIndex: 0, completed: true, weight: 20 }];
    const prs = detectNewPersonalRecords(finished, []);
    expect(prs).toEqual([]);
  });

  it('does not report anything when the set ties or falls short of the prior best', () => {
    const prior = [session({ actualSets: [{ exerciseId: 'squat', setIndex: 0, completed: true, weight: 60 }] })];
    const finished = [{ exerciseId: 'squat', setIndex: 0, completed: true, weight: 60 }];
    expect(detectNewPersonalRecords(finished, prior)).toEqual([]);
  });

  it('ignores a skipped (not completed) set even if its value would beat the record', () => {
    const prior = [session({ actualSets: [{ exerciseId: 'squat', setIndex: 0, completed: true, weight: 60 }] })];
    const finished = [{ exerciseId: 'squat', setIndex: 0, completed: false, weight: 100 }];
    expect(detectNewPersonalRecords(finished, prior)).toEqual([]);
  });

  it('reports the best of multiple sets in the same session that both beat the record, not a duplicate per set', () => {
    const prior = [session({ actualSets: [{ exerciseId: 'squat', setIndex: 0, completed: true, weight: 60 }] })];
    const finished = [
      { exerciseId: 'squat', setIndex: 0, completed: true, weight: 65 },
      { exerciseId: 'squat', setIndex: 1, completed: true, weight: 70 },
    ];
    const prs = detectNewPersonalRecords(finished, prior);
    expect(prs).toEqual([{ exerciseId: 'squat', kind: 'weight', value: 70, previousValue: 60 }]);
  });
});

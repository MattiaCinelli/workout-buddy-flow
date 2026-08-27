import { describe, expect, it } from 'vitest';
import { sessionsToCsv } from './historyCsv';
import { WorkoutSession } from '@/data/workoutSessions';
import { Exercise } from '@/data/exercises';

const exercises = [
  { id: 'bench', name: 'Bench Press' },
  { id: 'row', name: 'Row, seated' },
] as Exercise[];

const session = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's1', workoutId: 'w1', date: '2026-01-02T09:00:00.000Z', completedAt: '2026-01-02T09:40:00.000Z',
  title: 'Push', duration: 40, plannedDuration: 40, category: 'strength',
  sets: [{ exerciseId: 'bench', reps: 10, weight: 40 }],
  ...overrides,
});

describe('sessionsToCsv', () => {
  it('emits a header plus one row per logged set, oldest session first', () => {
    const csv = sessionsToCsv([
      session({ id: 'b', date: '2026-02-01T09:00:00.000Z', actualSets: [
        { exerciseId: 'bench', setIndex: 0, completed: true, reps: 8, weight: 45 },
      ] }),
      session({ id: 'a', date: '2026-01-01T09:00:00.000Z', perceivedExertion: 7, actualSets: [
        { exerciseId: 'bench', setIndex: 0, completed: true, reps: 10, weight: 40 },
        { exerciseId: 'row', setIndex: 1, completed: false, reps: 0, weight: 30 },
      ] }),
    ], exercises);

    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,workout,category,duration_min,perceived_exertion,exercise,set,set_kind,completed,reps,weight_kg,duration_s,distance_m,set_rpe');
    expect(lines[1]).toBe('2026-01-01,Push,strength,40,7,Bench Press,1,working,yes,10,40,,,');
    expect(lines[2]).toBe('2026-01-01,Push,strength,40,7,"Row, seated",2,working,no,0,30,,,');
    expect(lines[3]).toBe('2026-02-01,Push,strength,40,,Bench Press,1,working,yes,8,45,,,');
  });

  it('neutralises a spreadsheet formula in a workout title', () => {
    const csv = sessionsToCsv([session({ title: '=HYPERLINK("http://evil","x")' })], exercises);
    // leading = escaped with a quote, then the whole cell quoted for the comma
    expect(csv.split('\n')[1]).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
  });

  it('falls back to planned sets when a session has no actualSets', () => {
    const csv = sessionsToCsv([session({ actualSets: undefined })], exercises);
    expect(csv.split('\n')[1]).toBe('2026-01-02,Push,strength,40,,Bench Press,1,working,yes,10,40,,,');
  });

  it('flags warm-up and amrap sets and includes per-set RPE', () => {
    const csv = sessionsToCsv([session({ actualSets: [
      { exerciseId: 'bench', setIndex: 0, completed: true, reps: 12, weight: 20, warmup: true },
      { exerciseId: 'bench', setIndex: 1, completed: true, reps: 9, weight: 42, amrap: true, rpe: 9 },
    ] })], exercises);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('2026-01-02,Push,strength,40,,Bench Press,1,warmup,yes,12,20,,,');
    expect(lines[2]).toBe('2026-01-02,Push,strength,40,,Bench Press,2,amrap,yes,9,42,,,9');
  });
});

import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/data/workoutSessions';
import type { ExpandedScheduledWorkout } from './recurrence';
import { getUnplannedSessionsByDate, sessionCalendarDate } from './calendarSessions';

// Local-time constructors keep these tests independent of the machine's timezone.
const at = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

const session = (over: Partial<WorkoutSession> & { id: string }): WorkoutSession => ({
  workoutId: 'w1', title: 'Workout', date: at(2026, 9, 10), completedAt: at(2026, 9, 10),
  duration: 30, plannedDuration: 30, category: 'strength', sets: [], ...over,
});

const occurrence = (over: Partial<ExpandedScheduledWorkout> = {}): ExpandedScheduledWorkout => ({
  id: 's1', workoutId: 'w1', startDate: '2026-09-10', startTime: '09:00', recurrence: 'none',
  createdAt: '2026-09-01T00:00:00.000Z', displayDate: '2026-09-10', skipped: false, ...over,
} as ExpandedScheduledWorkout);

const range = ['2026-09-01', '2026-09-30'] as const;

describe('sessionCalendarDate', () => {
  it('uses the local day, so a workout just after midnight is not pushed to the day before', () => {
    expect(sessionCalendarDate({ completedAt: at(2026, 9, 10, 0, 30) })).toBe('2026-09-10');
    expect(sessionCalendarDate({ completedAt: at(2026, 9, 10, 23, 59) })).toBe('2026-09-10');
  });
});

describe('getUnplannedSessionsByDate', () => {
  it('lists a workout that was never scheduled on the day it was done', () => {
    const result = getUnplannedSessionsByDate([session({ id: 'a' })], [], [], ...range);
    expect([...result.keys()]).toEqual(['2026-09-10']);
    expect(result.get('2026-09-10')?.map(item => item.id)).toEqual(['a']);
  });

  it('leaves out a session started from a schedule that still exists', () => {
    const result = getUnplannedSessionsByDate(
      [session({ id: 'a', scheduledWorkoutId: 's1', scheduledDate: '2026-09-10' })],
      [{ id: 's1' }], [occurrence()], ...range,
    );
    expect(result.size).toBe(0);
  });

  it('keeps a session done on a different day than its schedule out of the list, since the schedule shows it as done', () => {
    const result = getUnplannedSessionsByDate(
      [session({ id: 'a', scheduledWorkoutId: 's1', scheduledDate: '2026-09-09', completedAt: at(2026, 9, 10) })],
      [{ id: 's1' }], [occurrence({ displayDate: '2026-09-09' })], ...range,
    );
    expect(result.size).toBe(0);
  });

  it('lists a session whose schedule was deleted, since nothing on the calendar shows it any more', () => {
    const result = getUnplannedSessionsByDate(
      [session({ id: 'a', scheduledWorkoutId: 'gone', scheduledDate: '2026-09-10' })], [], [], ...range,
    );
    expect(result.get('2026-09-10')).toHaveLength(1);
  });

  it('matches an older session that never stored the schedule id by workout and day', () => {
    const matched = getUnplannedSessionsByDate([session({ id: 'a', workoutId: 'w1' })], [{ id: 's1' }], [occurrence()], ...range);
    expect(matched.size).toBe(0);

    const otherWorkout = getUnplannedSessionsByDate([session({ id: 'b', workoutId: 'other' })], [{ id: 's1' }], [occurrence()], ...range);
    expect(otherWorkout.get('2026-09-10')).toHaveLength(1);
  });

  it('still lists an extra workout done the same day as an unrelated scheduled one', () => {
    const result = getUnplannedSessionsByDate(
      [session({ id: 'planned', scheduledWorkoutId: 's1', scheduledDate: '2026-09-10' }), session({ id: 'extra', workoutId: 'w2', completedAt: at(2026, 9, 10, 18) })],
      [{ id: 's1' }], [occurrence()], ...range,
    );
    expect(result.get('2026-09-10')?.map(item => item.id)).toEqual(['extra']);
  });

  it('groups by day, oldest first, and ignores days outside the range', () => {
    const result = getUnplannedSessionsByDate([
      session({ id: 'late', completedAt: at(2026, 9, 10, 20) }),
      session({ id: 'early', completedAt: at(2026, 9, 10, 7) }),
      session({ id: 'other-day', completedAt: at(2026, 9, 12) }),
      session({ id: 'outside', completedAt: at(2026, 10, 2) }),
    ], [], [], ...range);
    expect(result.get('2026-09-10')?.map(item => item.id)).toEqual(['early', 'late']);
    expect([...result.keys()].sort()).toEqual(['2026-09-10', '2026-09-12']);
  });
});

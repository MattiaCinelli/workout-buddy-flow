import { describe, expect, it } from 'vitest';
import { expandScheduledWorkouts } from './recurrence';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';

const base: Omit<ScheduledWorkout, 'recurrence' | 'startDate'> = {
  id: 'sw-1',
  workoutId: 'w-1',
  startTime: '09:00',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('expandScheduledWorkouts', () => {
  it('includes a one-time event only on its own date within range', () => {
    const schedule: ScheduledWorkout = { ...base, recurrence: 'none', startDate: '2026-03-10' };
    const inRange = expandScheduledWorkouts([schedule], new Date('2026-03-01'), new Date('2026-03-31'));
    expect(inRange).toHaveLength(1);
    expect(inRange[0].displayDate).toBe('2026-03-10');

    const outOfRange = expandScheduledWorkouts([schedule], new Date('2026-04-01'), new Date('2026-04-30'));
    expect(outOfRange).toHaveLength(0);
  });

  it('expands a daily recurrence to one instance per day in range', () => {
    const schedule: ScheduledWorkout = { ...base, recurrence: 'daily', startDate: '2026-03-10' };
    const expanded = expandScheduledWorkouts([schedule], new Date('2026-03-10'), new Date('2026-03-14'));
    expect(expanded.map(item => item.displayDate)).toEqual([
      '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14',
    ]);
  });

  it('does not expand a daily recurrence before its start date', () => {
    const schedule: ScheduledWorkout = { ...base, recurrence: 'daily', startDate: '2026-03-10' };
    const expanded = expandScheduledWorkouts([schedule], new Date('2026-03-01'), new Date('2026-03-12'));
    expect(expanded.map(item => item.displayDate)).toEqual(['2026-03-10', '2026-03-11', '2026-03-12']);
  });

  it('stops a daily recurrence at endRecurrenceDate', () => {
    const schedule: ScheduledWorkout = {
      ...base, recurrence: 'daily', startDate: '2026-03-10', endRecurrenceDate: '2026-03-12',
    };
    const expanded = expandScheduledWorkouts([schedule], new Date('2026-03-01'), new Date('2026-03-31'));
    expect(expanded.map(item => item.displayDate)).toEqual(['2026-03-10', '2026-03-11', '2026-03-12']);
  });

  it('expands a weekly recurrence only on the chosen weekday', () => {
    // 2026-03-10 is a Tuesday.
    const schedule: ScheduledWorkout = {
      ...base, recurrence: 'weekly', recurrenceDays: ['tuesday'], startDate: '2026-03-10',
    };
    const expanded = expandScheduledWorkouts([schedule], new Date('2026-03-01'), new Date('2026-03-31'));
    expect(expanded.map(item => item.displayDate)).toEqual(['2026-03-10', '2026-03-17', '2026-03-24', '2026-03-31']);
  });

  it('expands a weekly recurrence across multiple chosen weekdays, e.g. Mon-Fri', () => {
    // 2026-03-10 is a Tuesday; a Mon-Fri schedule starting there should skip
    // Monday 03-09 (before the start date) but include every weekday after,
    // and skip the weekend (03-14/03-15).
    const schedule: ScheduledWorkout = {
      ...base, recurrence: 'weekly',
      recurrenceDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startDate: '2026-03-10',
    };
    const expanded = expandScheduledWorkouts([schedule], new Date('2026-03-01'), new Date('2026-03-16'));
    expect(expanded.map(item => item.displayDate)).toEqual([
      '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-16',
    ]);
  });

  it('produces no instances for weekly recurrence missing recurrenceDays', () => {
    const schedule: ScheduledWorkout = { ...base, recurrence: 'weekly', startDate: '2026-03-10' };
    const expanded = expandScheduledWorkouts([schedule], new Date('2026-03-01'), new Date('2026-03-31'));
    expect(expanded).toHaveLength(0);
  });

  it('sorts mixed results by date then start time', () => {
    const early: ScheduledWorkout = { ...base, id: 'a', recurrence: 'none', startDate: '2026-03-15', startTime: '18:00' };
    const late: ScheduledWorkout = { ...base, id: 'b', recurrence: 'none', startDate: '2026-03-10', startTime: '07:00' };
    const sameDayLater: ScheduledWorkout = { ...base, id: 'c', recurrence: 'none', startDate: '2026-03-10', startTime: '19:00' };
    const expanded = expandScheduledWorkouts([early, late, sameDayLater], new Date('2026-03-01'), new Date('2026-03-31'));
    expect(expanded.map(item => item.id)).toEqual(['b', 'c', 'a']);
  });
});

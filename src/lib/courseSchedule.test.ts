import { describe, expect, it } from 'vitest';
import type { CourseWorkout } from '@/data/courses';
import type { ScheduledWorkout } from '@/data/scheduledWorkouts';
import {
  addMinutesToTime, getNextCourseItem, getNextSameDayWorkout, getSkippedCourseItemIds, normalizeCourseItemOrder,
} from './courseSchedule';

const slot = (id: string, day: number, order: number, workoutId = id): CourseWorkout => ({
  id, type: 'workout', workoutId, week: 1, day, order, completed: false,
});

describe('course scheduling', () => {
  it('interleaves separately-added ranges chronologically while preserving same-day order', () => {
    const normalized = normalizeCourseItemOrder([
      slot('a1', 1, 1), slot('a2', 2, 2), slot('b1', 1, 3), slot('b2', 2, 4),
    ]);
    expect(normalized.map(item => item.id)).toEqual(['a1', 'b1', 'a2', 'b2']);
    expect(normalized.map(item => item.order)).toEqual([1, 2, 3, 4]);
  });

  it('continues only to a later workout on the same day', () => {
    const items = [slot('warmup', 1, 1), slot('stretch', 1, 2), slot('tomorrow', 2, 3)];
    expect(getNextSameDayWorkout(items, 'warmup')?.id).toBe('stretch');
    expect(getNextSameDayWorkout(items, 'stretch')).toBeUndefined();
  });

  it('does not skip an explicit rest slot to auto-start another workout', () => {
    const rest: CourseWorkout = { id: 'rest', type: 'rest', week: 1, day: 1, order: 2, completed: false };
    expect(getNextSameDayWorkout([slot('first', 1, 1), rest, slot('later', 1, 3)], 'first')).toBeUndefined();
  });

  it('schedules consecutive workouts from the previous duration', () => {
    expect(addMinutesToTime('18:00', 15)).toBe('18:15');
    expect(addMinutesToTime('18:00', 75)).toBe('19:15');
  });

  describe('skipped slots', () => {
    const entry = (id: string, courseItemId: string, startDate: string, skippedDates?: string[]): ScheduledWorkout => ({
      id, workoutId: 'w', startDate, startTime: '07:00', recurrence: 'none', courseId: 'c', courseItemId,
      skippedDates, createdAt: '2026-09-01T00:00:00.000Z',
    });

    it('treats a slot as skipped only when every calendar entry for it is skipped', () => {
      const skipped = getSkippedCourseItemIds('c', [
        entry('e1', 'mon', '2026-09-14', ['2026-09-14']),
        // Moved from a recurring series: the old date is skipped, the new one is live.
        entry('e2', 'tue', '2026-09-15', ['2026-09-15']),
        entry('e3', 'tue', '2026-09-20'),
        entry('e4', 'wed', '2026-09-16'),
        { ...entry('e5', 'thu', '2026-09-17', ['2026-09-17']), courseId: 'other' },
      ]);
      expect([...skipped]).toEqual(['mon']);
    });

    it('moves the course past skipped slots, and never chains into one', () => {
      const items = [slot('mon', 1, 1), slot('mon2', 1, 2), slot('tue', 2, 3)];
      expect(getNextCourseItem(items, new Set(['mon', 'mon2']))?.id).toBe('tue');
      expect(getNextCourseItem(items)?.id).toBe('mon');
      expect(getNextSameDayWorkout(items, 'mon', new Set(['mon2']))).toBeUndefined();
    });
  });
});

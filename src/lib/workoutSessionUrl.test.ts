import { describe, expect, it } from 'vitest';
import { notificationWorkoutSessionUrl, scheduledWorkoutSessionUrl, workoutSessionUrl } from './workoutSessionUrl';

describe('workoutSessionUrl', () => {
  it('keeps the exact schedule occurrence and course slot', () => {
    expect(scheduledWorkoutSessionUrl({
      id: 'schedule 1', workoutId: 'workout/1', displayDate: '2026-09-10',
      courseId: 'course 1', courseItemId: 'slot 1',
    })).toBe('/workouts/workout/1/session?scheduledWorkoutId=schedule+1&scheduledDate=2026-09-10&courseId=course+1&courseItemId=slot+1');
  });

  it('does not add a question mark without context', () => {
    expect(workoutSessionUrl('w1')).toBe('/workouts/w1/session');
  });
});

describe('notificationWorkoutSessionUrl', () => {
  it('starts the notified workout and preserves its calendar/course context', () => {
    expect(notificationWorkoutSessionUrl({
      workoutId: 'workout/1', scheduleId: 'schedule 1', scheduledDate: '2026-09-21',
      courseId: 'course 1', courseItemId: 'day 2',
    })).toBe('/workouts/workout/1/session?scheduledWorkoutId=schedule+1&scheduledDate=2026-09-21&courseId=course+1&courseItemId=day+2');
  });

  it('supports older pending reminders that only contain a workout ID', () => {
    expect(notificationWorkoutSessionUrl({ workoutId: 'w1' })).toBe('/workouts/w1/session');
  });

  it('ignores notification actions that are not workout reminders', () => {
    expect(notificationWorkoutSessionUrl({ scheduleId: 's1' })).toBeNull();
  });
});

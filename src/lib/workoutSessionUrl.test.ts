import { describe, expect, it } from 'vitest';
import { scheduledWorkoutSessionUrl, workoutSessionUrl } from './workoutSessionUrl';

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

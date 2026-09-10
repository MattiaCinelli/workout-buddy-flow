import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/data/workoutSessions';
import { isScheduledOccurrenceCompleted } from './scheduleCompletion';

const schedule = {
  id: 'schedule-1',
  workoutId: 'workout-1',
  displayDate: '2026-09-10',
};

const session = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'session-1',
  workoutId: 'workout-1',
  completedAt: '2026-09-10T08:00:00.000Z',
  date: '2026-09-10T08:00:00.000Z',
  title: 'Strength',
  duration: 30,
  plannedDuration: 30,
  category: 'strength',
  sets: [],
  ...overrides,
});

describe('isScheduledOccurrenceCompleted', () => {
  it('matches a linked session for the exact recurring occurrence', () => {
    expect(isScheduledOccurrenceCompleted(schedule, [session({
      scheduledWorkoutId: 'schedule-1',
      scheduledDate: '2026-09-10',
    })])).toBe(true);
  });

  it('does not mark a different date in the recurring schedule complete', () => {
    expect(isScheduledOccurrenceCompleted(schedule, [session({
      scheduledWorkoutId: 'schedule-1',
      scheduledDate: '2026-09-09',
    })])).toBe(false);
  });

  it('does not treat a session linked to another schedule as completed', () => {
    expect(isScheduledOccurrenceCompleted(schedule, [session({
      scheduledWorkoutId: 'schedule-2',
      scheduledDate: '2026-09-10',
    })])).toBe(false);
  });

  it('recognizes a legacy unlinked session for the same workout and date', () => {
    expect(isScheduledOccurrenceCompleted(schedule, [session()])).toBe(true);
  });
});

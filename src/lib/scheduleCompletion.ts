import type { WorkoutSession } from '@/data/workoutSessions';
import type { ExpandedScheduledWorkout } from '@/lib/recurrence';

/**
 * A recurring schedule is completed one occurrence at a time. Older sessions
 * did not retain the schedule id, so an unlinked session for the same workout
 * and date is accepted as a backwards-compatible match.
 */
export const isScheduledOccurrenceCompleted = (
  schedule: Pick<ExpandedScheduledWorkout, 'id' | 'workoutId' | 'displayDate'>,
  sessions: WorkoutSession[],
): boolean => sessions.some(session => {
  const sessionDate = session.scheduledDate ?? session.completedAt.slice(0, 10);
  if (sessionDate !== schedule.displayDate) return false;

  return session.scheduledWorkoutId === schedule.id
    || (!session.scheduledWorkoutId && session.workoutId === schedule.workoutId);
});

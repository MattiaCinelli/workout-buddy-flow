import { format } from 'date-fns';
import type { ScheduledWorkout } from '@/data/scheduledWorkouts';
import type { WorkoutSession } from '@/data/workoutSessions';
import { isScheduledOccurrenceCompleted } from './scheduleCompletion';
import type { ExpandedScheduledWorkout } from './recurrence';

/** The local calendar day a session was completed on (`completedAt` is a UTC timestamp). */
export const sessionCalendarDate = (session: Pick<WorkoutSession, 'completedAt'>): string =>
  format(new Date(session.completedAt), 'yyyy-MM-dd');

/**
 * Workouts that were done without being on the calendar, grouped by the day
 * they were done (oldest first within a day). A completed workout that the
 * calendar already accounts for — the occurrence it was started from, which is
 * shown as done — is left out so nothing appears twice.
 *
 * A session counts as accounted for when it points at a schedule that still
 * exists, or (older sessions that never stored the schedule id) when it matches
 * a scheduled occurrence of the same workout that day. A session whose schedule
 * has since been deleted has nothing left on the calendar, so it is listed.
 */
export const getUnplannedSessionsByDate = (
  sessions: WorkoutSession[],
  schedules: Pick<ScheduledWorkout, 'id'>[],
  occurrences: ExpandedScheduledWorkout[],
  rangeStart: string,
  rangeEnd: string,
): Map<string, WorkoutSession[]> => {
  const liveScheduleIds = new Set(schedules.map(schedule => schedule.id));
  const byDate = new Map<string, WorkoutSession[]>();

  for (const session of sessions) {
    const date = sessionCalendarDate(session);
    if (date < rangeStart || date > rangeEnd) continue;

    const linked = !!session.scheduledWorkoutId && liveScheduleIds.has(session.scheduledWorkoutId);
    if (linked) continue;
    if (!session.scheduledWorkoutId && occurrences.some(occurrence => isScheduledOccurrenceCompleted(occurrence, [session]))) continue;

    byDate.set(date, [...(byDate.get(date) ?? []), session]);
  }

  for (const list of byDate.values()) list.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  return byDate;
};

/** "14:05" — the local time a session was completed. */
export const sessionCalendarTime = (session: Pick<WorkoutSession, 'completedAt'>): string =>
  format(new Date(session.completedAt), 'HH:mm');

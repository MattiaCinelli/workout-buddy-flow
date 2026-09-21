import type { ExpandedScheduledWorkout } from '@/lib/recurrence';

export interface WorkoutSessionContext {
  scheduledWorkoutId?: string;
  scheduledDate?: string;
  courseId?: string;
  courseItemId?: string;
}

export const workoutSessionUrl = (workoutId: string, context: WorkoutSessionContext = {}): string => {
  const params = new URLSearchParams();
  if (context.scheduledWorkoutId) params.set('scheduledWorkoutId', context.scheduledWorkoutId);
  if (context.scheduledDate) params.set('scheduledDate', context.scheduledDate);
  if (context.courseId) params.set('courseId', context.courseId);
  if (context.courseItemId) params.set('courseItemId', context.courseItemId);
  const query = params.toString();
  return `/workouts/${workoutId}/session${query ? `?${query}` : ''}`;
};

export const scheduledWorkoutSessionUrl = (
  schedule: Pick<ExpandedScheduledWorkout, 'id' | 'workoutId' | 'displayDate' | 'courseId' | 'courseItemId'>,
): string => workoutSessionUrl(schedule.workoutId, {
  scheduledWorkoutId: schedule.id,
  scheduledDate: schedule.displayDate,
  courseId: schedule.courseId,
  courseItemId: schedule.courseItemId,
});

// Notification extras cross a native bridge and therefore cannot be trusted
// to have the expected shape. Keep parsing here so both freshly scheduled and
// older pending reminders can safely launch a workout session.
export const notificationWorkoutSessionUrl = (extra: unknown): string | null => {
  if (!extra || typeof extra !== 'object') return null;
  const values = extra as Record<string, unknown>;
  if (typeof values.workoutId !== 'string' || !values.workoutId) return null;

  const optionalString = (key: string) => typeof values[key] === 'string' && values[key]
    ? values[key] as string
    : undefined;

  return workoutSessionUrl(values.workoutId, {
    scheduledWorkoutId: optionalString('scheduleId'),
    scheduledDate: optionalString('scheduledDate'),
    courseId: optionalString('courseId'),
    courseItemId: optionalString('courseItemId'),
  });
};

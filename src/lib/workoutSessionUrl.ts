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

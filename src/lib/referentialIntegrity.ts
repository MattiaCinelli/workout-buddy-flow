import { WorkoutEntry } from '@/data/workoutHistory';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course } from '@/data/courses';
import { WorkoutSession } from '@/data/workoutSessions';

// Counts how many places would be left with a dangling reference if an
// exercise or workout were deleted. Used to block deletion with a precise,
// human-readable reason instead of allowing orphaned IDs.

export const countExerciseTemplateReferences = (exerciseId: string, workouts: WorkoutEntry[]): number =>
  workouts.reduce((count, workout) => count + workout.sets.filter(set => set.exerciseId === exerciseId).length, 0);

export const countExerciseHistoryReferences = (exerciseId: string, sessions: WorkoutSession[]): number =>
  sessions.reduce((count, session) => count + session.sets.filter(set => set.exerciseId === exerciseId).length, 0);

export const countWorkoutScheduleReferences = (workoutId: string, scheduledWorkouts: ScheduledWorkout[]): number =>
  scheduledWorkouts.filter(item => item.workoutId === workoutId).length;

export const countWorkoutCourseReferences = (workoutId: string, courses: Course[]): number =>
  courses.reduce((count, course) => count + course.workouts.filter(item => item.workoutId === workoutId).length, 0);

export const countWorkoutHistoryReferences = (workoutId: string, sessions: WorkoutSession[]): number =>
  sessions.filter(session => session.workoutId === workoutId).length;

export interface DeletionBlock {
  blocked: boolean;
  reason: string;
}

export const checkExerciseDeletion = (
  exerciseId: string,
  workouts: WorkoutEntry[],
  sessions: WorkoutSession[]
): DeletionBlock => {
  const templateReferences = countExerciseTemplateReferences(exerciseId, workouts);
  const historyReferences = countExerciseHistoryReferences(exerciseId, sessions);
  const blocked = templateReferences > 0 || historyReferences > 0;
  if (!blocked) return { blocked, reason: '' };

  // Only name the categories that are actually blocking — listing "0
  // completed sets" alongside the real reason reads as if the exercise is
  // blocked for reasons it isn't, which is exactly what made this class of
  // error confusing to act on.
  const parts: string[] = [];
  if (templateReferences > 0) parts.push(`${templateReferences} template set${templateReferences === 1 ? '' : 's'}`);
  if (historyReferences > 0) parts.push(`${historyReferences} completed set${historyReferences === 1 ? '' : 's'} in your history`);

  return { blocked, reason: `This exercise is used by ${parts.join(' and ')}. Remove those first.` };
};

export const checkWorkoutDeletion = (
  workoutId: string,
  scheduledWorkouts: ScheduledWorkout[],
  courses: Course[],
  sessions: WorkoutSession[]
): DeletionBlock => {
  const scheduleReferences = countWorkoutScheduleReferences(workoutId, scheduledWorkouts);
  const courseReferences = countWorkoutCourseReferences(workoutId, courses);
  const historyReferences = countWorkoutHistoryReferences(workoutId, sessions);
  const blocked = scheduleReferences > 0 || courseReferences > 0 || historyReferences > 0;
  if (!blocked) return { blocked, reason: '' };

  const parts: string[] = [];
  if (scheduleReferences > 0) parts.push(`scheduled ${scheduleReferences} time${scheduleReferences === 1 ? '' : 's'} on your calendar`);
  if (courseReferences > 0) parts.push(`used in ${courseReferences} course item${courseReferences === 1 ? '' : 's'}`);
  if (historyReferences > 0) parts.push(`has ${historyReferences} completed session${historyReferences === 1 ? '' : 's'} in your history`);

  return { blocked, reason: `This workout is ${parts.join(', ')}. Remove those first.` };
};

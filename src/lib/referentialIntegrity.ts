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
  return {
    blocked,
    reason: blocked
      ? `This exercise is used by ${templateReferences} template set${templateReferences === 1 ? '' : 's'} and ${historyReferences} completed set${historyReferences === 1 ? '' : 's'}. Remove the template references and clear related history first.`
      : ''
  };
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
  return {
    blocked,
    reason: blocked
      ? `This workout is used by ${courseReferences} course item${courseReferences === 1 ? '' : 's'}, ${scheduleReferences} calendar item${scheduleReferences === 1 ? '' : 's'}, and ${historyReferences} completed session${historyReferences === 1 ? '' : 's'}. Remove those references first.`
      : ''
  };
};

import { WorkoutEntry, WorkoutSet } from './workoutHistory';

export interface WorkoutSetResult {
  exerciseId: string;
  setIndex: number;
  completed: boolean;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
}

/** An immutable record created when a workout is actually finished. */
export interface WorkoutSession extends WorkoutEntry {
  workoutId: string;
  completedAt: string;
  plannedDuration: number;
  sets: WorkoutSet[];
  courseId?: string;
  courseItemId?: string;
  scheduledWorkoutId?: string;
  actualSets?: WorkoutSetResult[];
  perceivedExertion?: number;
  completionNotes?: string;
}

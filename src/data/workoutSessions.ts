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

/** A historical snapshot created when a workout finishes; explicitly correctable from History. */
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

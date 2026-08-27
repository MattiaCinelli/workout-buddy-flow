import { WorkoutEntry, WorkoutSet } from './workoutHistory';

export interface WorkoutSetResult {
  exerciseId: string;
  setIndex: number;
  completed: boolean;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  // How hard that set actually felt, 1–10 (RPE). Optional, logged per set
  // in the completion dialog.
  rpe?: number;
  // Carried from the plan so history/records filtering doesn't depend on
  // the template staying index-aligned with the session.
  warmup?: boolean;
  amrap?: boolean;
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

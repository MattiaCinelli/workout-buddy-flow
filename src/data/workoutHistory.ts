export interface WorkoutSet {
  exerciseId: string;
  reps?: number;
  weight?: number;
  duration?: number; // in seconds
  distance?: number; // in meters
  restAfter?: number; // in seconds, rest period after this set
}

export interface WorkoutEntry {
  id: string;
  date: string;
  title: string;
  duration: number; // in minutes
  category: 'strength' | 'cardio' | 'flexibility' | 'balance' | 'mixed';
  description?: string; // what this workout is / who it's for — shown in the workout list
  favorite?: boolean; // protects against accidental deletion — see checkWorkoutDeletion
  sets: WorkoutSet[];
  restBetweenSets?: number; // in seconds, default rest between sets of the SAME exercise
  restBetweenExercises?: number; // in seconds, default rest when moving to a DIFFERENT exercise
  notes?: string; // optional notes about the workout (mood, energy, achievements)
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // reserved for self-hosted sync; local deletes don't set this yet
}

export const workoutHistory: WorkoutEntry[] = [];

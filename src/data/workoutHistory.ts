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
  sets: WorkoutSet[];
  restBetweenExercises?: number; // in seconds, default rest between different exercises
  notes?: string; // optional notes about the workout (mood, energy, achievements)
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // reserved for self-hosted sync; local deletes don't set this yet
}

export const workoutHistory: WorkoutEntry[] = [];

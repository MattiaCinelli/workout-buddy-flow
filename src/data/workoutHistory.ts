import type { ExecutionDirection } from './exercises';

export type WorkoutSetDirection = ExecutionDirection | 'none';

export interface WorkoutSet {
  exerciseId: string;
  // Explicit per-workout direction. Missing means a legacy workout; `none`
  // records an intentional override of an exercise's directional default.
  direction?: WorkoutSetDirection;
  reps?: number;
  weight?: number;
  duration?: number; // in seconds
  distance?: number; // in meters
  restAfter?: number; // in seconds, rest period after this set
  // A preparation set at a lighter load. Excluded from personal records,
  // volume, per-exercise history and (later) progression maths.
  warmup?: boolean;
  // "As many reps as possible": `reps` is then a target/floor to beat, not
  // a fixed count. The guided player says so, and the completion dialog
  // foregrounds capturing what was actually done.
  amrap?: boolean;
}

// The kinds a whole workout can be tagged as (distinct from an exercise's
// category). 'warm-up' exists so a light preparatory session can be
// dropped into a course ahead of the main workout. Single source of truth
// for every category <Select>, the History/Progress filters and the card
// colours — add here, not in each screen.
export const WORKOUT_CATEGORIES = ['strength', 'cardio', 'flexibility', 'balance', 'mixed', 'warm-up'] as const;
export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];
export const WORKOUT_CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  flexibility: 'Flexibility',
  balance: 'Balance',
  mixed: 'Mixed',
  'warm-up': 'Warm-up',
};

export interface WorkoutEntry {
  id: string;
  date: string;
  title: string;
  duration: number; // in minutes
  category: WorkoutCategory;
  description?: string; // what this workout is / who it's for — shown in the workout list
  favorite?: boolean; // protects against accidental deletion — see checkWorkoutDeletion
  sets: WorkoutSet[];
  restBetweenSets?: number; // in seconds, default rest between sets of the SAME exercise
  restBetweenExercises?: number; // in seconds, default rest when moving to a DIFFERENT exercise
  notes?: string; // optional notes about the workout (mood, energy, achievements)
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // sync tombstone — set by useIndexedDBCollection on delete while a sync server is connected; offline deletes hard-remove the row instead
}

const strengthSet = (exerciseId: string, reps: number, weight?: number): WorkoutSet =>
  weight === undefined ? { exerciseId, reps } : { exerciseId, reps, weight };

const holdSet = (exerciseId: string, duration: number): WorkoutSet => ({ exerciseId, duration });

// Seed templates written on a fresh install (see useWorkouts). They exist so
// a new user has something runnable to open, and something to copy and edit
// into their own. The two strength/mobility ones are also the building
// blocks of the seed "Strength & Stretch Starter" course (see courses.ts),
// so their ids must stay stable.
export const workoutHistory: WorkoutEntry[] = [
  {
    id: 'seed-strength',
    date: '2025-01-03T09:00:00.000Z',
    title: 'Full-Body Strength (Dumbbell)',
    category: 'strength',
    description: 'A balanced beginner strength session hitting every major muscle group with dumbbells. Three sets of each, run it twice a week.',
    duration: 40,
    restBetweenSets: 10,
    restBetweenExercises: 30,
    sets: [
      strengthSet('13', 10, 12), strengthSet('13', 10, 12), strengthSet('13', 10, 12),
      strengthSet('14', 10, 10), strengthSet('14', 10, 10), strengthSet('14', 10, 10),
      strengthSet('15', 10, 12), strengthSet('15', 10, 12), strengthSet('15', 10, 12),
      strengthSet('16', 10, 7), strengthSet('16', 10, 7), strengthSet('16', 10, 7),
      strengthSet('17', 10, 20), strengthSet('17', 10, 20), strengthSet('17', 10, 20),
      strengthSet('18', 12), strengthSet('18', 12), strengthSet('18', 12),
      holdSet('11', 40), holdSet('11', 40), holdSet('11', 40),
    ],
  },
  {
    id: 'seed-mobility',
    date: '2025-01-02T09:00:00.000Z',
    title: 'Full-Body Mobility & Stretch',
    category: 'flexibility',
    description: 'A head-to-toe static stretch routine. Ease into each hold, breathe, and never stretch into pain. Great on rest days or after a workout.',
    duration: 15,
    restBetweenSets: 10,
    restBetweenExercises: 30,
    sets: [
      holdSet('32', 40),
      holdSet('31', 40),
      holdSet('34', 30), holdSet('34', 30),
      holdSet('33', 25), holdSet('33', 25),
      holdSet('27', 30), holdSet('27', 30),
      holdSet('28', 30), holdSet('28', 30),
      holdSet('29', 30), holdSet('29', 30),
      holdSet('30', 30), holdSet('30', 30),
      holdSet('35', 30), holdSet('35', 30),
      holdSet('36', 20), holdSet('36', 20),
      holdSet('37', 30), holdSet('37', 30),
      holdSet('38', 20), holdSet('38', 20),
    ],
  },
  {
    id: 'seed-bodyweight',
    date: '2025-01-01T09:00:00.000Z',
    title: 'No-Equipment Full-Body',
    category: 'strength',
    description: 'A full-body strength circuit that needs nothing but the floor — good for travelling or days away from the gym.',
    duration: 25,
    restBetweenSets: 10,
    restBetweenExercises: 30,
    sets: [
      strengthSet('22', 15), strengthSet('22', 15), strengthSet('22', 15),
      strengthSet('5', 10), strengthSet('5', 10), strengthSet('5', 10),
      strengthSet('18', 12), strengthSet('18', 12), strengthSet('18', 12),
      strengthSet('19', 10), strengthSet('19', 10), strengthSet('19', 10),
      strengthSet('23', 20), strengthSet('23', 20), strengthSet('23', 20),
      strengthSet('25', 10), strengthSet('25', 10), strengthSet('25', 10),
      strengthSet('24', 10), strengthSet('24', 10), strengthSet('24', 10),
      holdSet('11', 40), holdSet('11', 40),
    ],
  },
];

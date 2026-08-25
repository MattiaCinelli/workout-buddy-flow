import { WorkoutEntry } from '@/data/workoutHistory';

export type WorkoutStep = { type: 'exercise' | 'rest'; exerciseId?: string; sourceSetIndex?: number;
  setIndex?: number; duration?: number; reps?: number; weight?: number; distance?: number };

export const buildWorkoutSteps = (workout: WorkoutEntry): WorkoutStep[] => {
  const steps: WorkoutStep[] = [];
  workout.sets.forEach((set, sourceSetIndex) => {
    const setIndex = workout.sets.slice(0, sourceSetIndex + 1)
      .filter(candidate => candidate.exerciseId === set.exerciseId).length - 1;
    steps.push({ type: 'exercise', exerciseId: set.exerciseId, sourceSetIndex, setIndex,
      reps: set.reps, weight: set.weight, duration: set.duration, distance: set.distance });
    const next = workout.sets[sourceSetIndex + 1];
    if (next) steps.push({ type: 'rest', duration: set.restAfter ??
      (next.exerciseId === set.exerciseId ? 60 : (workout.restBetweenExercises ?? 90)) });
  });
  return steps;
};

export const remainingSeconds = (deadline: number, now = Date.now()) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

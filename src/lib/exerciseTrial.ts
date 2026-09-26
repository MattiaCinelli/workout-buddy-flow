import { Exercise, defaultSetTargets } from '@/data/exercises';
import { WorkoutEntry, WorkoutSet } from '@/data/workoutHistory';
import { expandSetForExercise } from '@/lib/workoutDirections';
import { DEFAULT_REST_BETWEEN_EXERCISES, DEFAULT_REST_BETWEEN_SETS } from '@/lib/workoutRuntime';

/** Builds an in-memory workout used only by the exercise trial player. */
export const buildExerciseTrial = (exercise: Exercise): WorkoutEntry => {
  const baseSet: WorkoutSet = {
    exerciseId: exercise.id,
    ...defaultSetTargets(exercise),
    weight: exercise.defaultWeight,
    distance: exercise.defaultDistance,
  };
  const sets = Array.from({ length: exercise.defaultSets ?? 1 }, () => baseSet)
    .flatMap(set => expandSetForExercise({ ...set }, exercise));

  return {
    id: `exercise-trial:${exercise.id}`,
    date: new Date().toISOString(),
    title: `Try ${exercise.name}`,
    category: exercise.category,
    description: 'Temporary exercise trial. Results are not saved.',
    duration: 0,
    restBetweenSets: DEFAULT_REST_BETWEEN_SETS,
    restBetweenExercises: DEFAULT_REST_BETWEEN_EXERCISES,
    sets,
  };
};

import type { Exercise } from '@/data/exercises';
import type { WorkoutEntry } from '@/data/workoutHistory';
import { exerciseMatchesNameQuery } from '@/lib/exerciseAliases';

export const workoutContainsExerciseQuery = (
  workout: Pick<WorkoutEntry, 'sets'>,
  exercises: Exercise[],
  query: string,
): boolean => {
  const exerciseIds = new Set(workout.sets.map(set => set.exerciseId));
  return exercises.some(exercise => exerciseIds.has(exercise.id) && (
    exerciseMatchesNameQuery(exercise, query)
    || exercise.variations?.some(variation => variation.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  ));
};

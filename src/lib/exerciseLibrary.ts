import type { Exercise } from '@/data/exercises';
import type { MuscleGroup } from '@/data/muscleGroups';
import { exerciseMatchesNameQuery } from '@/lib/exerciseAliases';
import { exerciseMatchesMuscleFilter, muscleTagName, regionName, regionsOfExercise } from '@/lib/muscleRegions';

// 'warmup' filters on the warm-up tag, whatever the exercise's category.
export type ExerciseCategoryFilter = 'all' | 'warmup' | Exercise['category'];
export type ExerciseDifficultyFilter = 'all' | Exercise['difficulty'];

export interface ExerciseLibraryFilters {
  searchQuery: string;
  /** Muscle-group ids and `region:` tags; a region matches every muscle in it. */
  muscleGroupIds: string[];
  equipment: string[];
  category: ExerciseCategoryFilter;
  difficulty: ExerciseDifficultyFilter;
}

export const exerciseMatchesSearchQuery = (
  exercise: Exercise,
  searchQuery: string,
  muscleGroups: MuscleGroup[],
): boolean => {
  const query = searchQuery.trim().toLocaleLowerCase();
  if (!query) return true;

  return exerciseMatchesNameQuery(exercise, query)
    || exercise.category.toLocaleLowerCase().includes(query)
    || (exercise.warmup === true && ['warm-up', 'warmup', 'warm up'].some(word => word.includes(query)))
    || exercise.difficulty.toLocaleLowerCase().includes(query)
    || exercise.equipment?.some(item => item.toLocaleLowerCase().includes(query)) === true
    || exercise.muscleGroups.some(id =>
      id.toLocaleLowerCase().includes(query)
      || muscleTagName(id, muscleGroups).toLocaleLowerCase().includes(query))
    // "legs" finds an exercise tagged only Quadriceps, via its region.
    || [...regionsOfExercise(exercise, muscleGroups)].some(region => regionName(region).toLocaleLowerCase().includes(query));
};

export const filterExerciseLibrary = (
  exercises: Exercise[],
  filters: ExerciseLibraryFilters,
  muscleGroups: MuscleGroup[],
): Exercise[] => {
  return exercises.filter(exercise => {
    const matchesSearch = exerciseMatchesSearchQuery(exercise, filters.searchQuery, muscleGroups);
    const matchesMuscles = exerciseMatchesMuscleFilter(exercise, filters.muscleGroupIds, muscleGroups);
    const matchesEquipment = filters.equipment.length === 0
      || exercise.equipment?.some(item => filters.equipment.includes(item));
    return matchesSearch
      && matchesMuscles
      && matchesEquipment
      && (filters.category === 'all'
        || (filters.category === 'warmup' ? exercise.warmup === true : exercise.category === filters.category))
      && (filters.difficulty === 'all' || exercise.difficulty === filters.difficulty);
  });
};

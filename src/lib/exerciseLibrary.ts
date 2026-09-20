import type { Exercise } from '@/data/exercises';
import { exerciseMatchesNameQuery } from '@/lib/exerciseAliases';

export type ExerciseCategoryFilter = 'all' | Exercise['category'];
export type ExerciseDifficultyFilter = 'all' | Exercise['difficulty'];

export interface ExerciseLibraryFilters {
  searchQuery: string;
  muscleGroupIds: string[];
  equipment: string[];
  category: ExerciseCategoryFilter;
  difficulty: ExerciseDifficultyFilter;
}

export const exerciseMatchesSearchQuery = (
  exercise: Exercise,
  searchQuery: string,
  muscleGroupName: (id: string) => string,
): boolean => {
  const query = searchQuery.trim().toLocaleLowerCase();
  if (!query) return true;

  return exerciseMatchesNameQuery(exercise, query)
    || exercise.category.toLocaleLowerCase().includes(query)
    || exercise.difficulty.toLocaleLowerCase().includes(query)
    || exercise.equipment?.some(item => item.toLocaleLowerCase().includes(query)) === true
    || exercise.muscleGroups.some(id =>
      id.toLocaleLowerCase().includes(query)
      || muscleGroupName(id).toLocaleLowerCase().includes(query));
};

export const filterExerciseLibrary = (
  exercises: Exercise[],
  filters: ExerciseLibraryFilters,
  muscleGroupName: (id: string) => string,
): Exercise[] => {
  return exercises.filter(exercise => {
    const matchesSearch = exerciseMatchesSearchQuery(exercise, filters.searchQuery, muscleGroupName);
    const matchesMuscles = filters.muscleGroupIds.length === 0
      || exercise.muscleGroups.some(id => filters.muscleGroupIds.includes(id));
    const matchesEquipment = filters.equipment.length === 0
      || exercise.equipment?.some(item => filters.equipment.includes(item));
    return matchesSearch
      && matchesMuscles
      && matchesEquipment
      && (filters.category === 'all' || exercise.category === filters.category)
      && (filters.difficulty === 'all' || exercise.difficulty === filters.difficulty);
  });
};

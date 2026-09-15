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

export const filterExerciseLibrary = (
  exercises: Exercise[],
  filters: ExerciseLibraryFilters,
  muscleGroupName: (id: string) => string,
): Exercise[] => {
  const query = filters.searchQuery.trim().toLocaleLowerCase();
  return exercises.filter(exercise => {
    const matchesSearch = !query
      || exerciseMatchesNameQuery(exercise, query)
      || exercise.category.toLocaleLowerCase().includes(query)
      || exercise.difficulty.toLocaleLowerCase().includes(query)
      || exercise.equipment?.some(item => item.toLocaleLowerCase().includes(query))
      || exercise.muscleGroups.some(id => muscleGroupName(id).toLocaleLowerCase().includes(query));
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

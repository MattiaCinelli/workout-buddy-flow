import { Exercise, exerciseList } from '@/data/exercises';
import {
  getAllExercisesFromDB,
  saveExerciseToDB,
  deleteExerciseFromDB,
  bulkSaveExercisesToDB
} from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';

export const useExercises = () => {
  const { items, isLoading, error, load, create, update, remove, getById } =
    useIndexedDBCollection<Exercise>({
      getAll: getAllExercisesFromDB,
      save: saveExerciseToDB,
      remove: deleteExerciseFromDB,
      bulkSave: bulkSaveExercisesToDB,
      defaults: exerciseList,
      errorMessage: 'Failed to load exercises'
    });

  return {
    exercises: items,
    isLoading,
    error,
    createExercise: create,
    updateExercise: update,
    deleteExercise: remove,
    getExerciseById: getById,
    refreshExercises: load
  };
};

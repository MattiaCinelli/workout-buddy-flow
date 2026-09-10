import { Exercise, exerciseList } from '@/data/exercises';
import {
  getAllExercisesFromDB,
  saveExerciseToDB,
  deleteExerciseFromDB,
  bulkSaveExercisesToDB
} from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';

const legacySeedImages: Record<string, string> = {
  '10': '/exercises/stretch-forward-fold.svg',
  '28': '/exercises/stretch-forward-fold.svg',
  '29': '/exercises/stretch-figure-four.svg',
  '30': '/exercises/stretch-hip-flexor.svg',
  '31': '/exercises/childs-pose.svg',
  '32': '/exercises/cat-cow.svg',
  '34': '/exercises/downward-dog.svg',
  '36': '/exercises/stretch-arm-across.svg',
  '37': '/exercises/stretch-calf.svg',
};

export const useExercises = () => {
  const { items, isLoading, error, load, create, update, remove, getById } =
    useIndexedDBCollection<Exercise>({
      getAll: getAllExercisesFromDB,
      save: saveExerciseToDB,
      remove: deleteExerciseFromDB,
      bulkSave: bulkSaveExercisesToDB,
      defaults: exerciseList,
      seedKey: 'exercises',
      seedUpdates: (stored, defaults) => {
        const defaultsById = new Map(defaults.map(item => [item.id, item]));
        return stored.flatMap(item => {
          const replacement = defaultsById.get(item.id);
          const publicPhoto = replacement?.imageUrl?.startsWith('private-exercise:')
            ? `/exercises/${replacement.imageUrl.slice('private-exercise:'.length)}`
            : undefined;
          return replacement
            && (item.imageUrl === legacySeedImages[item.id] || item.imageUrl === publicPhoto)
            && !item.deletedAt
            ? [{ ...replacement, updatedAt: new Date().toISOString() }]
            : [];
        });
      },
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

import { MuscleGroup, defaultMuscleGroups } from '@/data/muscleGroups';
import {
  getAllMuscleGroupsFromDB,
  saveMuscleGroupToDB,
  deleteMuscleGroupFromDB,
  bulkSaveMuscleGroupsToDB
} from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';

export const useMuscleGroups = () => {
  const { items, isLoading, error, load, create, update, remove, getById } =
    useIndexedDBCollection<MuscleGroup>({
      getAll: getAllMuscleGroupsFromDB,
      save: saveMuscleGroupToDB,
      remove: deleteMuscleGroupFromDB,
      bulkSave: bulkSaveMuscleGroupsToDB,
      defaults: defaultMuscleGroups,
      seedKey: 'muscleGroups',
      errorMessage: 'Failed to load muscle groups'
    });

  return {
    muscleGroups: items,
    isLoading,
    error,
    createMuscleGroup: create,
    updateMuscleGroup: update,
    deleteMuscleGroup: remove,
    getMuscleGroupById: getById,
    refreshMuscleGroups: load
  };
};

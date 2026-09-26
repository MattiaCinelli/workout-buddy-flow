import { MuscleGroup, defaultMuscleGroups } from '@/data/muscleGroups';
import {
  getAllMuscleGroupsFromDB,
  saveMuscleGroupToDB,
  deleteMuscleGroupFromDB,
  bulkSaveMuscleGroupsToDB
} from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';
import { inferMuscleRegion } from '@/lib/muscleRegions';

export const useMuscleGroups = () => {
  const { items, isLoading, error, load, create, update, remove, restore, getById } =
    useIndexedDBCollection<MuscleGroup>({
      getAll: getAllMuscleGroupsFromDB,
      save: saveMuscleGroupToDB,
      remove: deleteMuscleGroupFromDB,
      bulkSave: bulkSaveMuscleGroupsToDB,
      defaults: defaultMuscleGroups,
      seedKey: 'muscleGroups',
      // Groups from before regions existed get one where it is clear —
      // built-ins by id, the user's own by name (Wrist, Foot, Piriformis…).
      // The rest stay Unsorted for the user to place in Manage.
      seedUpdates: (stored, defaults) => stored.flatMap(group => {
        if (group.region || group.deletedAt) return [];
        const region = inferMuscleRegion(group, defaults);
        return region ? [{ ...group, region, updatedAt: new Date().toISOString() }] : [];
      }),
      errorMessage: 'Failed to load muscle groups'
    });

  return {
    muscleGroups: items,
    isLoading,
    error,
    createMuscleGroup: create,
    updateMuscleGroup: update,
    deleteMuscleGroup: remove,
    restoreMuscleGroup: restore,
    getMuscleGroupById: getById,
    refreshMuscleGroups: load
  };
};

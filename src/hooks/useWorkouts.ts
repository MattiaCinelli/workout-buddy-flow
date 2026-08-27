import { useCallback } from 'react';
import { WorkoutEntry, workoutHistory as defaultWorkouts } from '@/data/workoutHistory';
import {
  getAllWorkoutsFromDB,
  saveWorkoutToDB,
  deleteWorkoutFromDB,
  bulkSaveWorkoutsToDB,
  getWorkoutByIdFromDB
} from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';

const byDateDescending = (workouts: WorkoutEntry[]) =>
  [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const useWorkouts = () => {
  const { items, isLoading, error, load, create, update, remove, clearAll, getById } =
    useIndexedDBCollection<WorkoutEntry>({
      getAll: getAllWorkoutsFromDB,
      save: saveWorkoutToDB,
      remove: deleteWorkoutFromDB,
      bulkSave: bulkSaveWorkoutsToDB,
      defaults: defaultWorkouts,
      seedKey: 'workouts',
      errorMessage: 'Failed to load workouts',
      transform: byDateDescending
    });

  // Get workout by ID from DB (for pages that need fresh data)
  const fetchWorkoutById = useCallback(async (id: string): Promise<WorkoutEntry | undefined> => {
    return getWorkoutByIdFromDB(id);
  }, []);

  return {
    workouts: items,
    isLoading,
    error,
    createWorkout: create,
    updateWorkout: update,
    deleteWorkout: remove,
    clearAllWorkouts: clearAll,
    getWorkoutById: getById,
    fetchWorkoutById,
    refreshWorkouts: load
  };
};

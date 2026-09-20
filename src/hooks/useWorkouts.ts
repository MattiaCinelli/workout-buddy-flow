import { useCallback, useEffect } from 'react';
import { WorkoutEntry, workoutHistory as defaultWorkouts } from '@/data/workoutHistory';
import { Exercise } from '@/data/exercises';
import { workoutDurationMinutes } from '@/lib/workoutRuntime';
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

export const useWorkouts = (exercises: Exercise[] = []) => {
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

  const createWorkout = useCallback((data: Omit<WorkoutEntry, 'id'>) =>
    create({ ...data, duration: workoutDurationMinutes(data as WorkoutEntry, exercises) }),
  [create, exercises]);

  const updateWorkout = useCallback((id: string, updates: Partial<WorkoutEntry>) => {
    const current = items.find(workout => workout.id === id);
    if (!current) return update(id, updates);
    const merged = { ...current, ...updates };
    return update(id, { ...updates, duration: workoutDurationMinutes(merged, exercises) });
  }, [exercises, items, update]);

  // Repair legacy values and inaccurate values received through sync. This
  // deliberately persists the correction so every screen and every device
  // sees the same duration, rather than fixing only the workout card display.
  useEffect(() => {
    if (isLoading || exercises.length === 0) return;
    items.forEach(workout => {
      const duration = workoutDurationMinutes(workout, exercises);
      if (workout.duration !== duration) void update(workout.id, { duration });
    });
  }, [exercises, isLoading, items, update]);

  // Get workout by ID from DB (for pages that need fresh data)
  const fetchWorkoutById = useCallback(async (id: string): Promise<WorkoutEntry | undefined> => {
    return getWorkoutByIdFromDB(id);
  }, []);

  return {
    workouts: items,
    isLoading,
    error,
    createWorkout,
    updateWorkout,
    deleteWorkout: remove,
    clearAllWorkouts: clearAll,
    getWorkoutById: getById,
    fetchWorkoutById,
    refreshWorkouts: load
  };
};

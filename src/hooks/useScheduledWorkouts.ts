import { useCallback } from 'react';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { getAllScheduledWorkoutsFromDB, saveScheduledWorkoutToDB, deleteScheduledWorkoutFromDB } from '@/lib/db';
import { expandScheduledWorkouts, ExpandedScheduledWorkout } from '@/lib/recurrence';
import { useIndexedDBCollection } from './useIndexedDBCollection';

export type { ExpandedScheduledWorkout } from '@/lib/recurrence';

export const useScheduledWorkouts = () => {
  const { items, isLoading, error, load, create, update, remove } =
    useIndexedDBCollection<ScheduledWorkout, 'createdAt'>({
      getAll: getAllScheduledWorkoutsFromDB,
      save: saveScheduledWorkoutToDB,
      remove: deleteScheduledWorkoutFromDB,
      errorMessage: 'Failed to load scheduled workouts',
      stamp: () => ({ createdAt: new Date().toISOString() })
    });

  // Get scheduled workouts for a specific date range (expands recurrence)
  const getScheduledWorkoutsForRange = useCallback((
    startDate: Date,
    endDate: Date
  ): ExpandedScheduledWorkout[] => expandScheduledWorkouts(items, startDate, endDate), [items]);

  // Get scheduled workouts for a specific date
  const getScheduledWorkoutsForDate = useCallback((date: Date): ExpandedScheduledWorkout[] => {
    return getScheduledWorkoutsForRange(date, date);
  }, [getScheduledWorkoutsForRange]);

  return {
    scheduledWorkouts: items,
    isLoading,
    error,
    createScheduledWorkout: create,
    updateScheduledWorkout: update,
    deleteScheduledWorkout: remove,
    getScheduledWorkoutsForRange,
    getScheduledWorkoutsForDate,
    refreshScheduledWorkouts: load
  };
};

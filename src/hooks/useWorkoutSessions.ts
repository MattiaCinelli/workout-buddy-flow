import { WorkoutSession } from '@/data/workoutSessions';
import {
  deleteAllWorkoutSessionsFromDB, deleteWorkoutSessionFromDB, getAllWorkoutSessionsFromDB, saveWorkoutSessionToDB
} from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';

const byCompletedAtDescending = (sessions: WorkoutSession[]) =>
  [...sessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

export const useWorkoutSessions = () => {
  const { items, isLoading, error, load, create, remove, clearAll } =
    useIndexedDBCollection<WorkoutSession>({
      getAll: getAllWorkoutSessionsFromDB,
      save: saveWorkoutSessionToDB,
      remove: deleteWorkoutSessionFromDB,
      clearAll: deleteAllWorkoutSessionsFromDB,
      errorMessage: 'Failed to load workout history',
      transform: byCompletedAtDescending
    });

  return {
    sessions: items,
    isLoading,
    error,
    createSession: create,
    deleteSession: remove,
    clearAllSessions: clearAll,
    refreshSessions: load
  };
};

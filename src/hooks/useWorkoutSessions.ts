import { WorkoutSession } from '@/data/workoutSessions';
import { deleteAllWorkoutSessionsFromDB, getAllWorkoutSessionsFromDB, saveWorkoutSessionToDB } from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';

const byCompletedAtDescending = (sessions: WorkoutSession[]) =>
  [...sessions].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

export const useWorkoutSessions = () => {
  const { items, isLoading, error, load, create, clearAll } =
    useIndexedDBCollection<WorkoutSession>({
      getAll: getAllWorkoutSessionsFromDB,
      save: saveWorkoutSessionToDB,
      remove: async () => { throw new Error('Individual sessions cannot be deleted.'); },
      clearAll: deleteAllWorkoutSessionsFromDB,
      errorMessage: 'Failed to load workout history',
      transform: byCompletedAtDescending
    });

  return {
    sessions: items,
    isLoading,
    error,
    createSession: create,
    clearAllSessions: clearAll,
    refreshSessions: load
  };
};

import { useCallback, useEffect, useState } from 'react';
import { WorkoutSession } from '@/data/workoutSessions';
import { deleteAllWorkoutSessionsFromDB, getAllWorkoutSessionsFromDB, saveWorkoutSessionToDB } from '@/lib/db';

export const useWorkoutSessions = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await getAllWorkoutSessionsFromDB();
      setSessions(stored.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()));
      setError(null);
    } catch (err) {
      console.error('Failed to load workout sessions:', err);
      setError('Failed to load workout history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  const createSession = useCallback(async (data: Omit<WorkoutSession, 'id'>) => {
    const session: WorkoutSession = { ...data, id: crypto.randomUUID() };
    await saveWorkoutSessionToDB(session);
    setSessions(previous => [session, ...previous]);
    return session;
  }, []);

  const clearAllSessions = useCallback(async () => {
    await deleteAllWorkoutSessionsFromDB();
    setSessions([]);
  }, []);

  return { sessions, isLoading, error, createSession, clearAllSessions, refreshSessions: loadSessions };
};

import { useState, useEffect, useCallback } from 'react';
import { WorkoutEntry, workoutHistory as defaultWorkouts } from '@/data/workoutHistory';
import { 
  getAllWorkoutsFromDB, 
  saveWorkoutToDB, 
  deleteWorkoutFromDB,
  bulkSaveWorkoutsToDB,
  getWorkoutByIdFromDB
} from '@/lib/db';

export const useWorkouts = () => {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load workouts from IndexedDB
  const loadWorkouts = useCallback(async () => {
    try {
      setIsLoading(true);
      let dbWorkouts = await getAllWorkoutsFromDB();
      
      // If no workouts in DB, initialize with defaults
      if (dbWorkouts.length === 0) {
        await bulkSaveWorkoutsToDB(defaultWorkouts);
        dbWorkouts = defaultWorkouts;
      }
      
      // Sort by date descending
      dbWorkouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setWorkouts(dbWorkouts);
      setError(null);
    } catch (err) {
      console.error('Failed to load workouts:', err);
      setError('Failed to load workouts');
      // Fallback to default list
      setWorkouts(defaultWorkouts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  // Create a new workout
  const createWorkout = useCallback(async (workoutData: Omit<WorkoutEntry, 'id'>): Promise<WorkoutEntry> => {
    const newWorkout: WorkoutEntry = {
      ...workoutData,
      id: crypto.randomUUID()
    };
    
    await saveWorkoutToDB(newWorkout);
    setWorkouts(prev => [newWorkout, ...prev].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ));
    
    return newWorkout;
  }, []);

  // Update an existing workout
  const updateWorkout = useCallback(async (id: string, updates: Partial<WorkoutEntry>): Promise<WorkoutEntry | null> => {
    const existingWorkout = workouts.find(w => w.id === id);
    if (!existingWorkout) return null;
    
    const updatedWorkout: WorkoutEntry = { ...existingWorkout, ...updates };
    await saveWorkoutToDB(updatedWorkout);
    setWorkouts(prev => prev.map(w => w.id === id ? updatedWorkout : w));
    
    return updatedWorkout;
  }, [workouts]);

  // Delete a workout
  const deleteWorkout = useCallback(async (id: string): Promise<WorkoutEntry | null> => {
    const workoutToDelete = workouts.find(w => w.id === id);
    if (!workoutToDelete) return null;
    
    await deleteWorkoutFromDB(id);
    setWorkouts(prev => prev.filter(w => w.id !== id));
    
    return workoutToDelete;
  }, [workouts]);

  // Get workout by ID
  const getWorkoutById = useCallback((id: string): WorkoutEntry | undefined => {
    return workouts.find(w => w.id === id);
  }, [workouts]);

  // Get workout by ID from DB (for pages that need fresh data)
  const fetchWorkoutById = useCallback(async (id: string): Promise<WorkoutEntry | undefined> => {
    return getWorkoutByIdFromDB(id);
  }, []);

  return {
    workouts,
    isLoading,
    error,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    getWorkoutById,
    fetchWorkoutById,
    refreshWorkouts: loadWorkouts
  };
};

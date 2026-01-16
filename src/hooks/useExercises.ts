import { useState, useEffect, useCallback } from 'react';
import { Exercise, exerciseList } from '@/data/exercises';
import { 
  getAllExercisesFromDB, 
  saveExerciseToDB, 
  deleteExerciseFromDB,
  bulkSaveExercisesToDB 
} from '@/lib/db';

export const useExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load exercises from IndexedDB
  const loadExercises = useCallback(async () => {
    try {
      setIsLoading(true);
      let dbExercises = await getAllExercisesFromDB();
      
      // If no exercises in DB, initialize with defaults
      if (dbExercises.length === 0) {
        await bulkSaveExercisesToDB(exerciseList);
        dbExercises = exerciseList;
      }
      
      setExercises(dbExercises);
      setError(null);
    } catch (err) {
      console.error('Failed to load exercises:', err);
      setError('Failed to load exercises');
      // Fallback to default list
      setExercises(exerciseList);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Create a new exercise
  const createExercise = useCallback(async (exerciseData: Omit<Exercise, 'id'>): Promise<Exercise> => {
    const newExercise: Exercise = {
      ...exerciseData,
      id: crypto.randomUUID()
    };
    
    await saveExerciseToDB(newExercise);
    setExercises(prev => [...prev, newExercise]);
    
    return newExercise;
  }, []);

  // Update an existing exercise
  const updateExercise = useCallback(async (id: string, updates: Partial<Exercise>): Promise<Exercise | null> => {
    const existingExercise = exercises.find(ex => ex.id === id);
    if (!existingExercise) return null;
    
    const updatedExercise: Exercise = { ...existingExercise, ...updates };
    await saveExerciseToDB(updatedExercise);
    setExercises(prev => prev.map(ex => ex.id === id ? updatedExercise : ex));
    
    return updatedExercise;
  }, [exercises]);

  // Delete an exercise
  const deleteExercise = useCallback(async (id: string): Promise<Exercise | null> => {
    const exerciseToDelete = exercises.find(ex => ex.id === id);
    if (!exerciseToDelete) return null;
    
    await deleteExerciseFromDB(id);
    setExercises(prev => prev.filter(ex => ex.id !== id));
    
    return exerciseToDelete;
  }, [exercises]);

  // Get exercise by ID
  const getExerciseById = useCallback((id: string): Exercise | undefined => {
    return exercises.find(ex => ex.id === id);
  }, [exercises]);

  return {
    exercises,
    isLoading,
    error,
    createExercise,
    updateExercise,
    deleteExercise,
    getExerciseById,
    refreshExercises: loadExercises
  };
};

import React, { createContext, useContext, ReactNode } from 'react';
import { useExercises } from '@/hooks/useExercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';

interface DataContextType {
  // Exercises
  exercises: Exercise[];
  exercisesLoading: boolean;
  exercisesError: string | null;
  createExercise: (data: Omit<Exercise, 'id'>) => Promise<Exercise>;
  updateExercise: (id: string, updates: Partial<Exercise>) => Promise<Exercise | null>;
  deleteExercise: (id: string) => Promise<Exercise | null>;
  getExerciseById: (id: string) => Exercise | undefined;
  refreshExercises: () => Promise<void>;
  
  // Workouts
  workouts: WorkoutEntry[];
  workoutsLoading: boolean;
  workoutsError: string | null;
  createWorkout: (data: Omit<WorkoutEntry, 'id'>) => Promise<WorkoutEntry>;
  updateWorkout: (id: string, updates: Partial<WorkoutEntry>) => Promise<WorkoutEntry | null>;
  deleteWorkout: (id: string) => Promise<WorkoutEntry | null>;
  getWorkoutById: (id: string) => WorkoutEntry | undefined;
  fetchWorkoutById: (id: string) => Promise<WorkoutEntry | undefined>;
  refreshWorkouts: () => Promise<void>;
  
  // Combined loading state
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    exercises,
    isLoading: exercisesLoading,
    error: exercisesError,
    createExercise,
    updateExercise,
    deleteExercise,
    getExerciseById,
    refreshExercises
  } = useExercises();
  
  const {
    workouts,
    isLoading: workoutsLoading,
    error: workoutsError,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    getWorkoutById,
    fetchWorkoutById,
    refreshWorkouts
  } = useWorkouts();

  const value: DataContextType = {
    exercises,
    exercisesLoading,
    exercisesError,
    createExercise,
    updateExercise,
    deleteExercise,
    getExerciseById,
    refreshExercises,
    
    workouts,
    workoutsLoading,
    workoutsError,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    getWorkoutById,
    fetchWorkoutById,
    refreshWorkouts,
    
    isLoading: exercisesLoading || workoutsLoading
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

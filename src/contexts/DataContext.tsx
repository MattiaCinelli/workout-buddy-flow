import React, { createContext, useContext, ReactNode } from 'react';
import { useExercises } from '@/hooks/useExercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useScheduledWorkouts, ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { useCourses } from '@/hooks/useCourses';
import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course, CourseWorkout } from '@/data/courses';

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
  clearAllWorkouts: () => Promise<void>;
  getWorkoutById: (id: string) => WorkoutEntry | undefined;
  fetchWorkoutById: (id: string) => Promise<WorkoutEntry | undefined>;
  refreshWorkouts: () => Promise<void>;
  
  // Scheduled Workouts
  scheduledWorkouts: ScheduledWorkout[];
  scheduledWorkoutsLoading: boolean;
  scheduledWorkoutsError: string | null;
  createScheduledWorkout: (data: Omit<ScheduledWorkout, 'id' | 'createdAt'>) => Promise<ScheduledWorkout>;
  updateScheduledWorkout: (id: string, updates: Partial<ScheduledWorkout>) => Promise<ScheduledWorkout | null>;
  deleteScheduledWorkout: (id: string) => Promise<ScheduledWorkout | null>;
  getScheduledWorkoutsForRange: (startDate: Date, endDate: Date) => ExpandedScheduledWorkout[];
  getScheduledWorkoutsForDate: (date: Date) => ExpandedScheduledWorkout[];
  refreshScheduledWorkouts: () => Promise<void>;
  
  // Courses
  courses: Course[];
  coursesLoading: boolean;
  coursesError: string | null;
  createCourse: (data: Omit<Course, 'id' | 'createdAt'>) => Promise<Course>;
  updateCourse: (id: string, updates: Partial<Course>) => Promise<Course | null>;
  deleteCourse: (id: string) => Promise<Course | null>;
  startCourse: (id: string) => Promise<Course | null>;
  restartCourse: (id: string) => Promise<Course | null>;
  completeWorkoutInCourse: (courseId: string, workoutId: string) => Promise<Course | null>;
  getNextWorkoutInCourse: (courseId: string) => CourseWorkout | null;
  getCourseById: (id: string) => Course | undefined;
  getCourseProgress: (courseId: string) => number;
  refreshCourses: () => Promise<void>;
  
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
    clearAllWorkouts,
    getWorkoutById,
    fetchWorkoutById,
    refreshWorkouts
  } = useWorkouts();

  const {
    scheduledWorkouts,
    isLoading: scheduledWorkoutsLoading,
    error: scheduledWorkoutsError,
    createScheduledWorkout,
    updateScheduledWorkout,
    deleteScheduledWorkout,
    getScheduledWorkoutsForRange,
    getScheduledWorkoutsForDate,
    refreshScheduledWorkouts
  } = useScheduledWorkouts();

  const {
    courses,
    isLoading: coursesLoading,
    error: coursesError,
    createCourse,
    updateCourse,
    deleteCourse,
    startCourse,
    restartCourse,
    completeWorkoutInCourse,
    getNextWorkoutInCourse,
    getCourseById,
    getCourseProgress,
    refreshCourses
  } = useCourses();

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
    clearAllWorkouts,
    getWorkoutById,
    fetchWorkoutById,
    refreshWorkouts,
    
    scheduledWorkouts,
    scheduledWorkoutsLoading,
    scheduledWorkoutsError,
    createScheduledWorkout,
    updateScheduledWorkout,
    deleteScheduledWorkout,
    getScheduledWorkoutsForRange,
    getScheduledWorkoutsForDate,
    refreshScheduledWorkouts,
    
    courses,
    coursesLoading,
    coursesError,
    createCourse,
    updateCourse,
    deleteCourse,
    startCourse,
    restartCourse,
    completeWorkoutInCourse,
    getNextWorkoutInCourse,
    getCourseById,
    getCourseProgress,
    refreshCourses,
    
    isLoading: exercisesLoading || workoutsLoading || scheduledWorkoutsLoading || coursesLoading
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

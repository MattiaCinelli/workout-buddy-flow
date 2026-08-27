import React, { createContext, useContext, ReactNode } from 'react';
import { useExercises } from '@/hooks/useExercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useScheduledWorkouts, ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { useCourses } from '@/hooks/useCourses';
import { useMuscleGroups } from '@/hooks/useMuscleGroups';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course, CourseWorkout } from '@/data/courses';
import { WorkoutSession } from '@/data/workoutSessions';
import { MuscleGroup } from '@/data/muscleGroups';
import { BodyMetric } from '@/data/bodyMetrics';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { cancelWorkoutReminders, scheduleWorkoutReminders } from '@/lib/notifications';
import { checkExerciseDeletion, checkWorkoutDeletion } from '@/lib/referentialIntegrity';

interface DataContextType {
  sessions: WorkoutSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  createSession: (data: Omit<WorkoutSession, 'id'>) => Promise<WorkoutSession>;
  deleteSession: (id: string) => Promise<WorkoutSession | null>;
  clearAllSessions: () => Promise<void>;
  refreshSessions: () => Promise<void>;
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
  completeWorkoutInCourse: (courseId: string, courseItemId: string) => Promise<Course | null>;
  getNextWorkoutInCourse: (courseId: string) => CourseWorkout | null;
  getCourseById: (id: string) => Course | undefined;
  getCourseProgress: (courseId: string) => number;
  refreshCourses: () => Promise<void>;

  // Muscle groups
  muscleGroups: MuscleGroup[];
  muscleGroupsLoading: boolean;
  muscleGroupsError: string | null;
  createMuscleGroup: (data: Omit<MuscleGroup, 'id'>) => Promise<MuscleGroup>;
  updateMuscleGroup: (id: string, updates: Partial<MuscleGroup>) => Promise<MuscleGroup | null>;
  deleteMuscleGroup: (id: string) => Promise<MuscleGroup | null>;
  refreshMuscleGroups: () => Promise<void>;

  // Body metrics
  bodyMetrics: BodyMetric[];
  bodyMetricsLoading: boolean;
  bodyMetricsError: string | null;
  createBodyMetric: (data: Omit<BodyMetric, 'id'>) => Promise<BodyMetric>;
  updateBodyMetric: (id: string, updates: Partial<BodyMetric>) => Promise<BodyMetric | null>;
  deleteBodyMetric: (id: string) => Promise<BodyMetric | null>;
  refreshBodyMetrics: () => Promise<void>;

  // Combined loading state
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { sessions, isLoading: sessionsLoading, error: sessionsError, createSession, deleteSession, clearAllSessions, refreshSessions } = useWorkoutSessions();
  const {
    exercises,
    isLoading: exercisesLoading,
    error: exercisesError,
    createExercise,
    updateExercise,
    deleteExercise: deleteExerciseRaw,
    getExerciseById,
    refreshExercises
  } = useExercises();
  
  const {
    workouts,
    isLoading: workoutsLoading,
    error: workoutsError,
    createWorkout,
    updateWorkout,
    deleteWorkout: deleteWorkoutRaw,
    clearAllWorkouts,
    getWorkoutById,
    fetchWorkoutById,
    refreshWorkouts
  } = useWorkouts();

  const {
    scheduledWorkouts,
    isLoading: scheduledWorkoutsLoading,
    error: scheduledWorkoutsError,
    createScheduledWorkout: createScheduledWorkoutRaw,
    updateScheduledWorkout: updateScheduledWorkoutRaw,
    deleteScheduledWorkout: deleteScheduledWorkoutRaw,
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

  const {
    muscleGroups,
    isLoading: muscleGroupsLoading,
    error: muscleGroupsError,
    createMuscleGroup,
    updateMuscleGroup,
    deleteMuscleGroup: deleteMuscleGroupRaw,
    refreshMuscleGroups
  } = useMuscleGroups();

  const {
    bodyMetrics,
    isLoading: bodyMetricsLoading,
    error: bodyMetricsError,
    createBodyMetric,
    updateBodyMetric,
    deleteBodyMetric,
    refreshBodyMetrics
  } = useBodyMetrics();

  const deleteExercise = async (id: string) => {
    const { blocked, reason } = checkExerciseDeletion(id, workouts, sessions);
    if (blocked) throw new Error(reason);
    return deleteExerciseRaw(id);
  };

  const deleteWorkout = async (id: string) => {
    const isFavorite = workouts.find(workout => workout.id === id)?.favorite ?? false;
    const { blocked, reason } = checkWorkoutDeletion(id, scheduledWorkouts, courses, sessions, isFavorite);
    if (blocked) throw new Error(reason);
    return deleteWorkoutRaw(id);
  };

  const createScheduledWorkout = async (data: Omit<ScheduledWorkout, 'id' | 'createdAt'>) => {
    const created = await createScheduledWorkoutRaw(data);
    const title = workouts.find(workout => workout.id === created.workoutId)?.title || 'Workout';
    try { await scheduleWorkoutReminders(created, title); }
    catch (error) { console.warn('Workout saved, but its reminder could not be scheduled:', error); }
    return created;
  };

  const updateScheduledWorkout = async (id: string, updates: Partial<ScheduledWorkout>) => {
    const updated = await updateScheduledWorkoutRaw(id, updates);
    if (updated) {
      const title = workouts.find(workout => workout.id === updated.workoutId)?.title || 'Workout';
      try { await scheduleWorkoutReminders(updated, title); }
      catch (error) { console.warn('Schedule updated, but its reminder could not be updated:', error); }
    }
    return updated;
  };

  const deleteScheduledWorkout = async (id: string) => {
    const deleted = await deleteScheduledWorkoutRaw(id);
    if (deleted) {
      try { await cancelWorkoutReminders(id); }
      catch (error) { console.warn('Schedule deleted, but its pending reminder could not be removed:', error); }
    }
    return deleted;
  };

  // Untags rather than blocks: a muscle-group tag is one of several loosely
  // descriptive labels on an exercise, not a hard dependency like a workout
  // referencing an exercise template — losing one tag doesn't leave the
  // exercise in a broken state the way a dangling exerciseId would.
  const deleteMuscleGroup = async (id: string) => {
    const deleted = await deleteMuscleGroupRaw(id);
    if (deleted) {
      const affected = exercises.filter(exercise => exercise.muscleGroups.includes(id));
      await Promise.all(affected.map(exercise =>
        updateExercise(exercise.id, { muscleGroups: exercise.muscleGroups.filter(group => group !== id) })
      ));
    }
    return deleted;
  };

  const value: DataContextType = {
    sessions,
    sessionsLoading,
    sessionsError,
    createSession,
    deleteSession,
    clearAllSessions,
    refreshSessions,
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

    muscleGroups,
    muscleGroupsLoading,
    muscleGroupsError,
    createMuscleGroup,
    updateMuscleGroup,
    deleteMuscleGroup,
    refreshMuscleGroups,

    bodyMetrics,
    bodyMetricsLoading,
    bodyMetricsError,
    createBodyMetric,
    updateBodyMetric,
    deleteBodyMetric,
    refreshBodyMetrics,

    isLoading: exercisesLoading || workoutsLoading || scheduledWorkoutsLoading || coursesLoading || sessionsLoading || muscleGroupsLoading || bodyMetricsLoading
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

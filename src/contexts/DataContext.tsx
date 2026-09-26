import React, { ReactNode, useEffect, useRef } from 'react';
import { DataContext } from './useData';
import { useExercises } from '@/hooks/useExercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useScheduledWorkouts, ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { useCourses } from '@/hooks/useCourses';
import { useMuscleGroups } from '@/hooks/useMuscleGroups';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { Exercise, exerciseList } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course, CourseWorkout } from '@/data/courses';
import { WorkoutSession } from '@/data/workoutSessions';
import { MuscleGroup } from '@/data/muscleGroups';
import { BodyMetric } from '@/data/bodyMetrics';
import { Measurement } from '@/data/measurements';
import { useMeasurements } from '@/hooks/useMeasurements';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { cancelWorkoutReminders, scheduleWorkoutReminders } from '@/lib/notifications';
import { checkExerciseDeletion, checkWorkoutDeletion } from '@/lib/referentialIntegrity';
import { getNextCourseItem, getSkippedCourseItemIds } from '@/lib/courseSchedule';

/** The eight synced collections, as named by the sync layer. */
export type SyncedCollection =
  | 'exercises' | 'workouts' | 'scheduledWorkouts' | 'courses'
  | 'workoutSessions' | 'muscleGroups' | 'bodyMetrics' | 'measurements';

export interface DataContextType {
  sessions: WorkoutSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  createSession: (data: Omit<WorkoutSession, 'id'>) => Promise<WorkoutSession>;
  updateSession: (id: string, updates: Partial<WorkoutSession>) => Promise<WorkoutSession | null>;
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
  restoreExercise: (exercise: Exercise) => Promise<Exercise>;
  getExerciseById: (id: string) => Exercise | undefined;
  refreshExercises: () => Promise<void>;
  
  // Workouts
  workouts: WorkoutEntry[];
  workoutsLoading: boolean;
  workoutsError: string | null;
  createWorkout: (data: Omit<WorkoutEntry, 'id'>) => Promise<WorkoutEntry>;
  updateWorkout: (id: string, updates: Partial<WorkoutEntry>) => Promise<WorkoutEntry | null>;
  deleteWorkout: (id: string) => Promise<WorkoutEntry | null>;
  restoreWorkout: (workout: WorkoutEntry) => Promise<WorkoutEntry>;
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
  restoreScheduledWorkout: (schedule: ScheduledWorkout) => Promise<ScheduledWorkout>;
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
  uncompleteWorkoutInCourse: (courseId: string, courseItemId: string) => Promise<Course | null>;
  /** First slot neither done nor skipped in the calendar. */
  getNextWorkoutInCourse: (courseId: string) => CourseWorkout | null;
  /** Ids of the course's slots whose calendar entries were all skipped. */
  getSkippedCourseItemIds: (courseId: string) => Set<string>;
  getCourseById: (id: string) => Course | undefined;
  /** Percentage of slots done or skipped in the calendar. */
  getCourseProgress: (courseId: string) => number;
  refreshCourses: () => Promise<void>;

  // Muscle groups
  muscleGroups: MuscleGroup[];
  muscleGroupsLoading: boolean;
  muscleGroupsError: string | null;
  createMuscleGroup: (data: Omit<MuscleGroup, 'id'>) => Promise<MuscleGroup>;
  updateMuscleGroup: (id: string, updates: Partial<MuscleGroup>) => Promise<MuscleGroup | null>;
  deleteMuscleGroup: (id: string) => Promise<MuscleGroup | null>;
  restoreMuscleGroup: (group: MuscleGroup) => Promise<MuscleGroup>;
  refreshMuscleGroups: () => Promise<void>;

  // Body metrics
  bodyMetrics: BodyMetric[];
  bodyMetricsLoading: boolean;
  bodyMetricsError: string | null;
  createBodyMetric: (data: Omit<BodyMetric, 'id'>) => Promise<BodyMetric>;
  updateBodyMetric: (id: string, updates: Partial<BodyMetric>) => Promise<BodyMetric | null>;
  deleteBodyMetric: (id: string) => Promise<BodyMetric | null>;
  refreshBodyMetrics: () => Promise<void>;

  // Self-measured records (toe-touch gap, plank hold, ...)
  measurements: Measurement[];
  measurementsLoading: boolean;
  measurementsError: string | null;
  createMeasurement: (data: Omit<Measurement, 'id'>) => Promise<Measurement>;
  updateMeasurement: (id: string, updates: Partial<Measurement>) => Promise<Measurement | null>;
  deleteMeasurement: (id: string) => Promise<Measurement | null>;
  refreshMeasurements: () => Promise<void>;

  // Combined loading state
  isLoading: boolean;
}

const BUILT_IN_EXERCISE_IDS = new Set(exerciseList.map(exercise => exercise.id));
const normalizedExerciseName = (name: string) => name.trim().toLocaleLowerCase();

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { sessions, isLoading: sessionsLoading, error: sessionsError, createSession, updateSession, deleteSession, clearAllSessions, refreshSessions } = useWorkoutSessions();
  const {
    exercises,
    isLoading: exercisesLoading,
    error: exercisesError,
    createExercise,
    updateExercise,
    deleteExercise: deleteExerciseRaw,
    restoreExercise,
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
    restoreWorkout,
    clearAllWorkouts,
    getWorkoutById,
    fetchWorkoutById,
    refreshWorkouts
  } = useWorkouts(exercises);

  const {
    scheduledWorkouts,
    isLoading: scheduledWorkoutsLoading,
    error: scheduledWorkoutsError,
    createScheduledWorkout: createScheduledWorkoutRaw,
    updateScheduledWorkout: updateScheduledWorkoutRaw,
    deleteScheduledWorkout: deleteScheduledWorkoutRaw,
    restoreScheduledWorkout: restoreScheduledWorkoutRaw,
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
    uncompleteWorkoutInCourse,
    getCourseById,
    refreshCourses
  } = useCourses();

  // A slot skipped in the calendar (a holiday, say) no longer holds the
  // course up: the next workout is the first one neither done nor skipped.
  const getSkippedCourseItemIdsFor = (courseId: string) => getSkippedCourseItemIds(courseId, scheduledWorkouts);
  const getNextWorkoutInCourse = (courseId: string): CourseWorkout | null => {
    const course = courses.find(item => item.id === courseId);
    return course ? getNextCourseItem(course.workouts, getSkippedCourseItemIds(courseId, scheduledWorkouts)) : null;
  };
  // Skipped slots count toward progress like done ones: the course is
  // finished once every slot is either done or deliberately skipped.
  const getCourseProgress = (courseId: string): number => {
    const course = courses.find(item => item.id === courseId);
    if (!course || course.workouts.length === 0) return 0;
    const skipped = getSkippedCourseItemIds(courseId, scheduledWorkouts);
    const settled = course.workouts.filter(item => item.completed || skipped.has(item.id)).length;
    return Math.round((settled / course.workouts.length) * 100);
  };

  const {
    muscleGroups,
    isLoading: muscleGroupsLoading,
    error: muscleGroupsError,
    createMuscleGroup,
    updateMuscleGroup,
    deleteMuscleGroup: deleteMuscleGroupRaw,
    restoreMuscleGroup,
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

  const {
    measurements,
    isLoading: measurementsLoading,
    error: measurementsError,
    createMeasurement,
    updateMeasurement,
    deleteMeasurement,
    refreshMeasurements
  } = useMeasurements();

  const duplicateRepairStarted = useRef(new Set<string>());
  useEffect(() => {
    if (exercisesLoading || workoutsLoading || sessionsLoading) return;

    const byName = new Map<string, Exercise[]>();
    exercises.forEach(exercise => {
      const key = normalizedExerciseName(exercise.name);
      if (key) byName.set(key, [...(byName.get(key) ?? []), exercise]);
    });

    for (const [name, matches] of byName) {
      if (matches.length < 2 || duplicateRepairStarted.current.has(name)) continue;
      duplicateRepairStarted.current.add(name);
      const canonical = matches.find(exercise => BUILT_IN_EXERCISE_IDS.has(exercise.id)) ?? matches[0];
      const duplicates = matches.filter(exercise => exercise.id !== canonical.id);

      void (async () => {
        try {
          for (const duplicate of duplicates) {
            for (const workout of workouts.filter(item => item.sets.some(set => set.exerciseId === duplicate.id))) {
              await updateWorkout(workout.id, {
                sets: workout.sets.map(set => set.exerciseId === duplicate.id
                  ? { ...set, exerciseId: canonical.id }
                  : set),
              });
            }
            for (const session of sessions.filter(item =>
              item.sets.some(set => set.exerciseId === duplicate.id)
              || item.actualSets?.some(set => set.exerciseId === duplicate.id))) {
              await updateSession(session.id, {
                sets: session.sets.map(set => set.exerciseId === duplicate.id
                  ? { ...set, exerciseId: canonical.id }
                  : set),
                actualSets: session.actualSets?.map(set => set.exerciseId === duplicate.id
                  ? { ...set, exerciseId: canonical.id }
                  : set),
              });
            }
            await deleteExerciseRaw(duplicate.id);
          }
        } catch (error) {
          duplicateRepairStarted.current.delete(name);
          console.error(`Could not reconcile duplicate exercise name "${canonical.name}":`, error);
        }
      })();
    }
  }, [
    exercises, exercisesLoading, workouts, workoutsLoading, sessions, sessionsLoading,
    updateWorkout, updateSession, deleteExerciseRaw,
  ]);

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
    try { await scheduleWorkoutReminders(created, title, sessions); }
    catch (error) { console.warn('Workout saved, but its reminder could not be scheduled:', error); }
    return created;
  };

  const updateScheduledWorkout = async (id: string, updates: Partial<ScheduledWorkout>) => {
    const updated = await updateScheduledWorkoutRaw(id, updates);
    if (updated) {
      const title = workouts.find(workout => workout.id === updated.workoutId)?.title || 'Workout';
      try { await scheduleWorkoutReminders(updated, title, sessions); }
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

  const restoreScheduledWorkout = async (schedule: ScheduledWorkout) => {
    const restored = await restoreScheduledWorkoutRaw(schedule);
    const title = workouts.find(workout => workout.id === restored.workoutId)?.title || 'Workout';
    try { await scheduleWorkoutReminders(restored, title, sessions); }
    catch (error) { console.warn('Schedule restored, but its reminder could not be recreated:', error); }
    return restored;
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
    updateSession,
    deleteSession,
    clearAllSessions,
    refreshSessions,
    exercises,
    exercisesLoading,
    exercisesError,
    createExercise,
    updateExercise,
    deleteExercise,
    restoreExercise,
    getExerciseById,
    refreshExercises,
    
    workouts,
    workoutsLoading,
    workoutsError,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    restoreWorkout,
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
    restoreScheduledWorkout,
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
    uncompleteWorkoutInCourse,
    getNextWorkoutInCourse,
    getSkippedCourseItemIds: getSkippedCourseItemIdsFor,
    getCourseById,
    getCourseProgress,
    refreshCourses,

    muscleGroups,
    muscleGroupsLoading,
    muscleGroupsError,
    createMuscleGroup,
    updateMuscleGroup,
    deleteMuscleGroup,
    restoreMuscleGroup,
    refreshMuscleGroups,

    bodyMetrics,
    bodyMetricsLoading,
    bodyMetricsError,
    createBodyMetric,
    updateBodyMetric,
    deleteBodyMetric,
    refreshBodyMetrics,

    measurements,
    measurementsLoading,
    measurementsError,
    createMeasurement,
    updateMeasurement,
    deleteMeasurement,
    refreshMeasurements,

    isLoading: exercisesLoading || workoutsLoading || scheduledWorkoutsLoading || coursesLoading || sessionsLoading || muscleGroupsLoading || bodyMetricsLoading || measurementsLoading
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

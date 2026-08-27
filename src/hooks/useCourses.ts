import { useCallback } from 'react';
import { Course, CourseWorkout } from '@/data/courses';
import { getAllCoursesFromDB, saveCourseToDB, deleteCourseFromDB } from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';

// Normalizes course records from earlier schema versions (unique item IDs,
// week/day defaults) and keeps the list sorted newest-first.
const normalizeAndSort = (courses: Course[]): Course[] => {
  const normalized = courses.map(course => ({
    ...course,
    durationWeeks: course.durationWeeks || Math.max(1, ...course.workouts.map(item => item.week || 1)),
    workouts: course.workouts.map((item, index) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      type: item.type || 'workout',
      week: item.week || 1,
      day: item.day || Math.min(7, index + 1),
    }))
  } as Course));
  return normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const useCourses = () => {
  const { items, isLoading, error, load, create, update, remove, getById } =
    useIndexedDBCollection<Course, 'createdAt'>({
      getAll: getAllCoursesFromDB,
      save: saveCourseToDB,
      remove: deleteCourseFromDB,
      errorMessage: 'Failed to load courses',
      transform: normalizeAndSort,
      stamp: () => ({ createdAt: new Date().toISOString() })
    });

  // Start a course (set startedAt)
  const startCourse = useCallback(async (id: string): Promise<Course | null> => {
    return update(id, { startedAt: new Date().toISOString() });
  }, [update]);

  // Restart a course (reset all workout completions)
  const restartCourse = useCallback(async (id: string): Promise<Course | null> => {
    const course = items.find(c => c.id === id);
    if (!course) return null;

    const resetWorkouts = course.workouts.map(w => ({
      ...w,
      completed: false,
      completedAt: undefined
    }));

    return update(id, {
      workouts: resetWorkouts,
      startedAt: new Date().toISOString(),
      completedAt: undefined
    });
  }, [items, update]);

  // Complete a workout in a course
  const completeWorkoutInCourse = useCallback(async (courseId: string, courseItemId: string): Promise<Course | null> => {
    const course = items.find(c => c.id === courseId);
    if (!course) return null;

    const updatedWorkouts = course.workouts.map(w =>
      w.id === courseItemId
        ? { ...w, completed: true, completedAt: new Date().toISOString() }
        : w
    );

    const allCompleted = updatedWorkouts.every(w => w.completed);

    return update(courseId, {
      workouts: updatedWorkouts,
      completedAt: allCompleted ? new Date().toISOString() : undefined
    });
  }, [items, update]);

  const uncompleteWorkoutInCourse = useCallback(async (courseId: string, courseItemId: string): Promise<Course | null> => {
    const course = items.find(c => c.id === courseId);
    if (!course) return null;
    return update(courseId, {
      workouts: course.workouts.map(item => item.id === courseItemId
        ? { ...item, completed: false, completedAt: undefined }
        : item),
      completedAt: undefined,
    });
  }, [items, update]);

  // Get the next workout in a course
  const getNextWorkoutInCourse = useCallback((courseId: string): CourseWorkout | null => {
    const course = items.find(c => c.id === courseId);
    if (!course) return null;

    const sortedWorkouts = [...course.workouts].sort((a, b) => a.order - b.order);
    return sortedWorkouts.find(w => !w.completed) || null;
  }, [items]);

  // Get course progress (percentage)
  const getCourseProgress = useCallback((courseId: string): number => {
    const course = items.find(c => c.id === courseId);
    if (!course || course.workouts.length === 0) return 0;

    const completedCount = course.workouts.filter(w => w.completed).length;
    return Math.round((completedCount / course.workouts.length) * 100);
  }, [items]);

  return {
    courses: items,
    isLoading,
    error,
    createCourse: create,
    updateCourse: update,
    deleteCourse: remove,
    startCourse,
    restartCourse,
    completeWorkoutInCourse,
    uncompleteWorkoutInCourse,
    getNextWorkoutInCourse,
    getCourseById: getById,
    getCourseProgress,
    refreshCourses: load
  };
};

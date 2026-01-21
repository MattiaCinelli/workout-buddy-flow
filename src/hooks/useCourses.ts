import { useState, useEffect, useCallback } from 'react';
import { Course, CourseWorkout } from '@/data/courses';
import { 
  getAllCoursesFromDB, 
  saveCourseToDB, 
  deleteCourseFromDB 
} from '@/lib/db';

export const useCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load courses from IndexedDB
  const loadCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      const dbCourses = await getAllCoursesFromDB();
      // Sort by creation date descending
      dbCourses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCourses(dbCourses);
      setError(null);
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError('Failed to load courses');
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Create a new course
  const createCourse = useCallback(async (courseData: Omit<Course, 'id' | 'createdAt'>): Promise<Course> => {
    const newCourse: Course = {
      ...courseData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    
    await saveCourseToDB(newCourse);
    setCourses(prev => [newCourse, ...prev]);
    
    return newCourse;
  }, []);

  // Update an existing course
  const updateCourse = useCallback(async (id: string, updates: Partial<Course>): Promise<Course | null> => {
    const existingCourse = courses.find(c => c.id === id);
    if (!existingCourse) return null;
    
    const updatedCourse: Course = { ...existingCourse, ...updates };
    await saveCourseToDB(updatedCourse);
    setCourses(prev => prev.map(c => c.id === id ? updatedCourse : c));
    
    return updatedCourse;
  }, [courses]);

  // Delete a course
  const deleteCourse = useCallback(async (id: string): Promise<Course | null> => {
    const courseToDelete = courses.find(c => c.id === id);
    if (!courseToDelete) return null;
    
    await deleteCourseFromDB(id);
    setCourses(prev => prev.filter(c => c.id !== id));
    
    return courseToDelete;
  }, [courses]);

  // Start a course (set startedAt)
  const startCourse = useCallback(async (id: string): Promise<Course | null> => {
    return updateCourse(id, { startedAt: new Date().toISOString() });
  }, [updateCourse]);

  // Restart a course (reset all workout completions)
  const restartCourse = useCallback(async (id: string): Promise<Course | null> => {
    const course = courses.find(c => c.id === id);
    if (!course) return null;
    
    const resetWorkouts = course.workouts.map(w => ({
      ...w,
      completed: false,
      completedAt: undefined
    }));
    
    return updateCourse(id, { 
      workouts: resetWorkouts, 
      startedAt: new Date().toISOString(),
      completedAt: undefined 
    });
  }, [courses, updateCourse]);

  // Complete a workout in a course
  const completeWorkoutInCourse = useCallback(async (courseId: string, workoutId: string): Promise<Course | null> => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return null;
    
    const updatedWorkouts = course.workouts.map(w => 
      w.workoutId === workoutId 
        ? { ...w, completed: true, completedAt: new Date().toISOString() }
        : w
    );
    
    // Check if all workouts are completed
    const allCompleted = updatedWorkouts.every(w => w.completed);
    
    return updateCourse(courseId, { 
      workouts: updatedWorkouts,
      completedAt: allCompleted ? new Date().toISOString() : undefined
    });
  }, [courses, updateCourse]);

  // Get the next workout in a course
  const getNextWorkoutInCourse = useCallback((courseId: string): CourseWorkout | null => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return null;
    
    // Find the first incomplete workout (sorted by order)
    const sortedWorkouts = [...course.workouts].sort((a, b) => a.order - b.order);
    return sortedWorkouts.find(w => !w.completed) || null;
  }, [courses]);

  // Get course by ID
  const getCourseById = useCallback((id: string): Course | undefined => {
    return courses.find(c => c.id === id);
  }, [courses]);

  // Get course progress (percentage)
  const getCourseProgress = useCallback((courseId: string): number => {
    const course = courses.find(c => c.id === courseId);
    if (!course || course.workouts.length === 0) return 0;
    
    const completedCount = course.workouts.filter(w => w.completed).length;
    return Math.round((completedCount / course.workouts.length) * 100);
  }, [courses]);

  return {
    courses,
    isLoading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
    startCourse,
    restartCourse,
    completeWorkoutInCourse,
    getNextWorkoutInCourse,
    getCourseById,
    getCourseProgress,
    refreshCourses: loadCourses
  };
};

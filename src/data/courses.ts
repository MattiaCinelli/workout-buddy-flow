export interface CourseWorkout {
  workoutId: string;
  order: number;
  completed: boolean;
  completedAt?: string; // ISO date string
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  workouts: CourseWorkout[];
  createdAt: string;
  startedAt?: string; // When user started the course
  completedAt?: string; // When entire course was completed
}

export const defaultCourses: Course[] = [];

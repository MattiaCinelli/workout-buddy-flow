export interface CourseWorkout {
  id: string;
  type: 'workout' | 'rest';
  workoutId?: string;
  order: number;
  week: number;
  day: number;
  title?: string;
  instructions?: string;
  completed: boolean;
  completedAt?: string; // ISO date string
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  goal?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string;
  durationWeeks?: number;
  workouts: CourseWorkout[];
  createdAt: string;
  startedAt?: string; // When user started the course
  completedAt?: string; // When entire course was completed
}

export const defaultCourses: Course[] = [];

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
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // reserved for self-hosted sync; local deletes don't set this yet
}

// One template week, repeated for the length of the starter course. `day`
// is an offset from the user's chosen start date (see CourseScheduleModal),
// so day 1 lands on whatever weekday they begin.
const STARTER_WEEK: Array<{ day: number; workoutId?: string; title?: string; instructions: string }> = [
  { day: 1, workoutId: 'seed-strength', instructions: 'Full-body strength. Nudge a lift up by the smallest increment once 3×10 feels controlled.' },
  { day: 2, workoutId: 'seed-mobility', instructions: 'Easy mobility work — move gently and breathe into each hold.' },
  { day: 3, workoutId: 'seed-bodyweight', instructions: 'Bodyweight circuit. Prioritise clean form and a steady pace over speed.' },
  { day: 4, title: 'Recovery day', instructions: 'Rest, walk, or stretch lightly. Recovery is when the adaptation happens.' },
  { day: 5, workoutId: 'seed-strength', instructions: 'Second strength session of the week — match or beat Day 1 where it feels good.' },
  { day: 6, workoutId: 'seed-mobility', instructions: 'Full mobility routine to close out the training week.' },
  { day: 7, title: 'Recovery day', instructions: 'Full rest day.' },
];

const buildStarterCourse = (): Course => {
  const workouts: CourseWorkout[] = [];
  let order = 1;
  for (let week = 1; week <= 4; week += 1) {
    for (const slot of STARTER_WEEK) {
      workouts.push({
        id: `seed-course-w${week}d${slot.day}`,
        type: slot.workoutId ? 'workout' : 'rest',
        workoutId: slot.workoutId,
        title: slot.title,
        instructions: slot.instructions,
        order: order++,
        week,
        day: slot.day,
        completed: false,
      });
    }
  }
  return {
    id: 'seed-course-starter',
    title: 'Strength & Stretch Starter',
    description: 'A four-week introduction to training with this app: two dumbbell strength days, a no-equipment day, and mobility work each week, with built-in recovery days.',
    goal: 'Build a consistent full-body habit and learn the app',
    difficulty: 'beginner',
    prerequisites: 'None — start here if you are new to structured training.',
    durationWeeks: 4,
    workouts,
    createdAt: '2025-01-01T09:00:00.000Z',
  };
};

// Seeded on a fresh install (see useCourses) so a new user can see how a
// multi-week program ties workouts to a calendar.
export const defaultCourses: Course[] = [buildStarterCourse()];

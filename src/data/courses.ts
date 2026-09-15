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
  deletedAt?: string; // sync tombstone — set by useIndexedDBCollection on delete while a sync server is connected; offline deletes hard-remove the row instead
}

// One template week, repeated for the length of the starter course. `day`
// is an offset from the user's chosen start date (see CourseScheduleModal),
// so day 1 lands on whatever weekday they begin.
const STARTER_WEEK: Array<{ day: number; workoutId?: string; title?: string; instructions: string }> = [
  { day: 1, workoutId: 'seed-strength', instructions: 'Full-body strength. Nudge a lift up by the smallest increment once 3×10 feels controlled.' },
  { day: 2, workoutId: 'seed-mobility', instructions: 'Easy mobility work — move gently and breathe into each hold.' },
  { day: 3, workoutId: 'seed-bodyweight', instructions: 'Bodyweight circuit. Prioritise clean form and a steady pace over speed.' },
  { day: 5, workoutId: 'seed-strength', instructions: 'Second strength session of the week — match or beat Day 1 where it feels good.' },
  { day: 6, workoutId: 'seed-mobility', instructions: 'Full mobility routine to close out the training week.' },
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
    description: 'A four-week introduction to training with this app: two dumbbell strength days, a no-equipment day, and mobility work each week. Days without an entry are simply unscheduled.',
    goal: 'Build a consistent full-body habit and learn the app',
    difficulty: 'beginner',
    prerequisites: 'None — start here if you are new to structured training.',
    durationWeeks: 4,
    workouts,
    createdAt: '2025-01-01T09:00:00.000Z',
  };
};

const buildWetNoodleCourse = (): Course => {
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
  const dayTitles = ['Posterior Chain', 'Hip Opening', 'Upper-Body Mobility', 'Active Flexibility', 'Full-Body Noodle'];
  const weekInstructions = [
    'Learn each position at an easy intensity. Stop well before pain and focus on smooth breathing.',
    'Create space with calm, controlled repetitions and relaxed holds; do not force additional range.',
    'Own the range with active control. Straight-leg raises and Cossack squats are introduced this week.',
    'Move deeper only while maintaining control. Friday adds a supported wide-straddle hold.',
    'Use gentle contract–relax technique on Friday for hamstrings, hip flexors and frog stretch: contract at 20–30% effort for five seconds, then relax.',
    'Keep the Week 5 structure without increasing intensity. Prioritise normal breathing, relaxation and control.',
  ];
  const workouts: CourseWorkout[] = [];
  let order = 1;

  for (let week = 1; week <= 6; week += 1) {
    dayNames.forEach((dayName, index) => workouts.push({
      id: `seed-wet-noodle-course-w${week}d${index + 1}`,
      type: 'workout',
      workoutId: `seed-wet-noodle-w${week}-${dayName}`,
      title: dayTitles[index],
      instructions: weekInstructions[week - 1],
      order: order++,
      week,
      day: index + 1,
      completed: false,
    }));
  }

  return {
    id: 'seed-course-wet-noodle',
    title: 'Zero to Wet Noodle',
    description: 'A six-week, Monday–Friday beginner flexibility course covering hamstrings, hips, adductors, shoulders, lats, ankles, calves and thoracic mobility. Every hold is 2 × 30 seconds and every active movement is 2 × 13 repetitions.',
    goal: 'Build comfortable full-body flexibility and active control through a consistent six-week practice.',
    difficulty: 'beginner',
    prerequisites: 'None. Warm up with five minutes of light movement before every session and never stretch into pain.',
    durationWeeks: 6,
    workouts,
    createdAt: '2025-02-01T09:00:00.000Z',
  };
};

// Seeded on a fresh install (see useCourses) so a new user can see how a
// multi-week program ties workouts to a calendar.
export const defaultCourses: Course[] = [buildStarterCourse(), buildWetNoodleCourse()];

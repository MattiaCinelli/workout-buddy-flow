// Sample content for demo mode (see src/lib/demoMode.ts). Nothing here is
// ever written to the real database: it seeds the separate demo database
// the moment that database is created. Dates are generated relative to
// "now" so the streak, calendar and progress charts look alive whenever
// the demo is started.
import { addDays, format, startOfDay, subDays } from 'date-fns';
import type { Exercise } from './exercises';
import type { WorkoutEntry, WorkoutSet } from './workoutHistory';
import type { WorkoutSession, WorkoutSetResult } from './workoutSessions';
import type { ScheduledWorkout, WeekDay } from './scheduledWorkouts';
import type { Course } from './courses';
import type { BodyMetric } from './bodyMetrics';
import type { Measurement } from './measurements';
import { defaultMuscleGroups, type MuscleGroup } from './muscleGroups';

export interface DemoData {
  exercises: Exercise[];
  workouts: WorkoutEntry[];
  workoutSessions: WorkoutSession[];
  scheduledWorkouts: ScheduledWorkout[];
  courses: Course[];
  muscleGroups: MuscleGroup[];
  bodyMetrics: BodyMetric[];
  measurements: Measurement[];
}

const image = (name: string) => `/demo/${name}.svg`;

export const demoExercises: Exercise[] = [
  {
    id: 'demo-squat', name: 'Bodyweight Squat', category: 'strength', difficulty: 'beginner',
    muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'], equipment: ['Bodyweight'],
    logType: 'reps', defaultSets: 3, defaultReps: 12, secondsPerRep: 3,
    instructions: 'Feet shoulder-width apart. Sit your hips back and down until your thighs are parallel to the floor, then drive back up through your heels.',
    imageUrl: image('squat'),
  },
  {
    id: 'demo-push-up', name: 'Push-up', category: 'strength', difficulty: 'beginner',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Bodyweight'],
    logType: 'reps', defaultSets: 3, defaultReps: 10, secondsPerRep: 3,
    instructions: 'Hands under your shoulders, body in one straight line. Lower your chest to just above the floor and press back up.',
    imageUrl: image('push-up'),
  },
  {
    id: 'demo-plank', name: 'Forearm Plank', category: 'strength', difficulty: 'beginner',
    muscleGroups: ['Core', 'Shoulders'], equipment: ['Mat'],
    logType: 'time', defaultSets: 2, defaultDuration: 30,
    instructions: 'Elbows under your shoulders, squeeze your glutes and keep a straight line from head to heels. Breathe steadily.',
    imageUrl: image('plank'),
  },
  {
    id: 'demo-jumping-jack', name: 'Jumping Jacks', category: 'cardio', difficulty: 'beginner',
    muscleGroups: ['Full Body'], equipment: ['Bodyweight'],
    logType: 'time', defaultSets: 2, defaultDuration: 40,
    instructions: 'Jump your feet wide while swinging your arms overhead, then jump back to the start. Keep a light, springy rhythm.',
    imageUrl: image('jumping-jack'),
  },
  {
    id: 'demo-lunge', name: 'Reverse Lunge', category: 'strength', difficulty: 'beginner',
    muscleGroups: ['Quadriceps', 'Glutes'], equipment: ['Bodyweight'],
    logType: 'reps', defaultSets: 2, defaultReps: 10, secondsPerRep: 4,
    executionDirections: ['left', 'right'],
    instructions: 'Step one foot back and lower until both knees are bent to about 90°. Push through the front heel to return.',
    imageUrl: image('lunge'),
  },
  {
    id: 'demo-curl', name: 'Dumbbell Curl', category: 'strength', difficulty: 'beginner',
    muscleGroups: ['Biceps', 'Forearms'], equipment: ['Dumbbells'],
    logType: 'reps', defaultSets: 3, defaultReps: 10, defaultWeight: 8, secondsPerRep: 4,
    progression: { mode: 'double', incrementKg: 1, repRangeMin: 8, repRangeMax: 12 },
    instructions: 'Elbows tucked at your sides. Curl the weight up without swinging, pause, then lower slowly.',
    imageUrl: image('dumbbell-curl'),
  },
];

const reps = (exerciseId: string, count: number, weight?: number): WorkoutSet =>
  weight === undefined ? { exerciseId, reps: count } : { exerciseId, reps: count, weight };
const hold = (exerciseId: string, duration: number): WorkoutSet => ({ exerciseId, duration });
const times = <T,>(count: number, make: () => T): T[] => Array.from({ length: count }, make);

const FULL_BODY = 'demo-workout-full-body';
const ENERGISER = 'demo-workout-energiser';
const ARMS = 'demo-workout-arms';

const buildWorkouts = (created: string): WorkoutEntry[] => [
  {
    id: FULL_BODY, date: created, title: 'Quick Full-Body', category: 'strength', duration: 20, favorite: true,
    description: 'Squats, push-ups, lunges and a plank — a complete session with no equipment.',
    restBetweenSets: 20, restBetweenExercises: 40,
    sets: [
      ...times(3, () => reps('demo-squat', 12)),
      ...times(3, () => reps('demo-push-up', 10)),
      { ...reps('demo-lunge', 10), direction: 'left' }, { ...reps('demo-lunge', 10), direction: 'right' },
      { ...reps('demo-lunge', 10), direction: 'left' }, { ...reps('demo-lunge', 10), direction: 'right' },
      ...times(2, () => hold('demo-plank', 30)),
    ],
  },
  {
    id: ENERGISER, date: created, title: 'Morning Energiser', category: 'cardio', duration: 10,
    description: 'Ten minutes to wake up: jumping jacks, squats and a plank finish.',
    restBetweenSets: 15, restBetweenExercises: 20,
    sets: [
      ...times(2, () => hold('demo-jumping-jack', 40)),
      ...times(2, () => reps('demo-squat', 15)),
      hold('demo-plank', 45),
    ],
  },
  {
    id: ARMS, date: created, title: 'Arms & Push', category: 'strength', duration: 15,
    description: 'Dumbbell curls paired with push-ups. Add weight once all sets hit 12 reps.',
    restBetweenSets: 45, restBetweenExercises: 60,
    sets: [
      ...times(3, () => reps('demo-curl', 10, 8)),
      ...times(3, () => reps('demo-push-up', 10)),
    ],
  },
];

// Planned sets become logged results, with a small per-session nudge so the
// progress charts and personal records show improvement over time.
const logResults = (sets: WorkoutSet[], progress: number): WorkoutSetResult[] =>
  sets.map((set, setIndex) => ({
    exerciseId: set.exerciseId,
    setIndex,
    completed: true,
    ...(set.direction ? { direction: set.direction } : {}),
    ...(set.reps !== undefined ? { reps: set.reps + (set.exerciseId === 'demo-push-up' ? Math.floor(progress / 2) : 0) } : {}),
    ...(set.weight !== undefined ? { weight: set.weight + Math.floor(progress / 3) } : {}),
    ...(set.duration !== undefined ? { duration: set.duration + (set.exerciseId === 'demo-plank' ? progress * 5 : 0) } : {}),
  }));

const at = (day: Date, hour: number, minute = 0) => {
  const value = new Date(day);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
};

const dateOnly = (day: Date) => format(day, 'yyyy-MM-dd');

export const buildDemoData = (now: Date = new Date()): DemoData => {
  const today = startOfDay(now);
  const start = subDays(today, 56);
  const created = at(start, 8);
  const stamp = { updatedAt: created };
  const workouts = buildWorkouts(created).map(workout => ({ ...workout, ...stamp }));
  const byId = new Map(workouts.map(workout => [workout.id, workout]));

  // Eight weeks of two to four sessions a week, building up, and ending in a
  // four-day streak yesterday so today's scheduled workout is still to do.
  const perWeek = [2, 2, 3, 3, 2, 3, 3];
  const daysAgo = [
    ...perWeek.flatMap((count, week) => [0, 2, 4, 5].slice(0, count).map(offset => 56 - week * 7 - offset)),
    4, 3, 2, 1,
  ];
  const rotation = [FULL_BODY, ENERGISER, ARMS];
  const workoutSessions: WorkoutSession[] = daysAgo.map((ago, index) => {
    const workoutId = rotation[index % rotation.length];
    const workout = byId.get(workoutId)!;
    const completedAt = at(subDays(today, ago), workoutId === ARMS ? 18 : 7, 30);
    const progress = Math.floor(index / 2);
    return {
      ...workout,
      id: `demo-session-${index + 1}`,
      workoutId,
      date: completedAt,
      completedAt,
      duration: workout.duration + (index % 3) - 1,
      plannedDuration: workout.duration,
      actualSets: logResults(workout.sets, progress),
      perceivedExertion: 6 + (index % 3),
      updatedAt: completedAt,
    };
  });

  const scheduleDays: WeekDay[] = ['monday', 'wednesday', 'friday'];
  const scheduledWorkouts: ScheduledWorkout[] = [
    {
      id: 'demo-schedule-today', workoutId: ENERGISER, startDate: dateOnly(today), startTime: '18:30', endTime: '18:40',
      recurrence: 'none', createdAt: created, ...stamp,
    },
    {
      id: 'demo-schedule-full-body', workoutId: FULL_BODY, startDate: dateOnly(addDays(today, 1)), startTime: '07:00', endTime: '07:20',
      recurrence: 'weekly', recurrenceDays: scheduleDays, createdAt: created, ...stamp,
    },
    {
      id: 'demo-schedule-arms', workoutId: ARMS, startDate: dateOnly(addDays(today, 2)), startTime: '18:00', endTime: '18:15',
      recurrence: 'none', createdAt: created, ...stamp,
    },
  ];

  const courses: Course[] = [{
    id: 'demo-course-starter', title: 'Two-Week Kick-Start', difficulty: 'beginner', durationWeeks: 2,
    description: 'A gentle two-week plan to build the habit: three short sessions a week with rest days in between.',
    goal: 'Train three times a week for two weeks',
    createdAt: created, startedAt: at(subDays(today, 5), 8), ...stamp,
    workouts: [
      { id: 'demo-course-1', type: 'workout', workoutId: FULL_BODY, order: 0, week: 1, day: 1, completed: true, completedAt: at(subDays(today, 4), 7, 30) },
      { id: 'demo-course-2', type: 'rest', order: 1, week: 1, day: 2, title: 'Rest day', instructions: 'Go for an easy walk.', completed: true, completedAt: at(subDays(today, 3), 20) },
      { id: 'demo-course-3', type: 'workout', workoutId: ARMS, order: 2, week: 1, day: 3, completed: true, completedAt: at(subDays(today, 3), 18, 30) },
      { id: 'demo-course-4', type: 'workout', workoutId: ENERGISER, order: 3, week: 1, day: 5, completed: false },
      { id: 'demo-course-5', type: 'workout', workoutId: FULL_BODY, order: 4, week: 2, day: 1, completed: false },
      { id: 'demo-course-6', type: 'workout', workoutId: ARMS, order: 5, week: 2, day: 3, completed: false },
      { id: 'demo-course-7', type: 'workout', workoutId: FULL_BODY, order: 6, week: 2, day: 5, completed: false },
    ],
  }];

  const bodyMetrics: BodyMetric[] = Array.from({ length: 9 }, (_, week) => ({
    id: `demo-weight-${week}`,
    date: dateOnly(subDays(today, 56 - week * 7)),
    weight: Math.round((72.5 - week * 0.3 + (week % 2) * 0.2) * 10) / 10,
    updatedAt: created,
  }));

  const measurements: Measurement[] = [0, 1, 2, 3, 4].map(step => ({
    id: `demo-measurement-plank-${step}`,
    measurementId: 'demo-plank-hold',
    name: 'Longest plank hold',
    kind: 'time',
    better: 'higher',
    value: 45 + step * 15,
    date: dateOnly(subDays(today, 50 - step * 12)),
    updatedAt: created,
  }));

  return {
    exercises: demoExercises.map(exercise => ({ ...exercise, ...stamp })),
    workouts,
    workoutSessions,
    scheduledWorkouts,
    courses,
    muscleGroups: defaultMuscleGroups.map(group => ({ ...group, ...stamp })),
    bodyMetrics,
    measurements,
  };
};

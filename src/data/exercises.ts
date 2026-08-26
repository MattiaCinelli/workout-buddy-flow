export type ExerciseLogType = 'reps' | 'time';

export interface Exercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'balance';
  muscleGroups: string[]; // MuscleGroup ids — see src/data/muscleGroups.ts
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  // Whether a set of this exercise is measured in reps (push-ups) or a
  // duration (a yoga hold) — independent of category: a 'strength'
  // exercise like a plank is still time-based. Optional only so exercises
  // created before this field existed keep working — see getLogType below.
  logType?: ExerciseLogType;
  defaultSets?: number; // how many sets to pre-fill when adding this exercise to a workout
  defaultReps?: number; // used when logType === 'reps'
  defaultDuration?: number; // seconds, used when logType === 'time'
  // How long one rep takes, in seconds — used to build a countdown for
  // reps-based sets too, so the user has something to follow along with
  // rather than an open-ended "do 10 reps whenever." Defaults to 3 (see
  // DEFAULT_SECONDS_PER_REP) when unset.
  secondsPerRep?: number;
  defaultWeight?: number; // optional, e.g. a loaded exercise's usual working weight
  defaultDistance?: number; // optional, meters — e.g. a usual run/ride distance
  instructions?: string; // How to perform it — shown to the user browsing the library and during a workout
  imageUrl?: string; // URL to the local image
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // reserved for self-hosted sync; local deletes don't set this yet
}

// Exercises created before logType existed have no explicit value — fall
// back to the old category-based guess so they keep behaving the same way
// until someone edits them and picks one explicitly.
export const getLogType = (exercise: Pick<Exercise, 'category' | 'logType'>): ExerciseLogType =>
  exercise.logType ?? (exercise.category === 'cardio' || exercise.category === 'flexibility' ? 'time' : 'reps');

export const DEFAULT_SECONDS_PER_REP = 3;

export const getSecondsPerRep = (exercise: Pick<Exercise, 'secondsPerRep'>): number =>
  exercise.secondsPerRep ?? DEFAULT_SECONDS_PER_REP;

export const exerciseList: Exercise[] = [
  {
    id: '1',
    name: 'Barbell Squat',
    category: 'strength',
    muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings', 'Back'],
    difficulty: 'intermediate',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 50,
    instructions: 'Bar across your upper back, feet shoulder-width apart. Bend knees and hips to lower until thighs are parallel to the floor, keeping your chest up and knees tracking over your toes, then drive back up.',
    imageUrl: '/exercises/squat.jpg'
  },
  {
    id: '2',
    name: 'Bench Press',
    category: 'strength',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
    difficulty: 'intermediate',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 40,
    instructions: 'Lie on the bench, grip the bar slightly wider than shoulder-width. Lower it to your mid-chest with control, then press back up to full arm extension without flaring your elbows too wide.',
    imageUrl: '/exercises/bench-press.jpg'
  },
  {
    id: '3',
    name: 'Deadlift',
    category: 'strength',
    muscleGroups: ['Back', 'Glutes', 'Hamstrings'],
    difficulty: 'advanced',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 5,
    defaultWeight: 60,
    instructions: 'Stand with the bar over mid-foot, hinge at the hips to grip it just outside your knees. Keep your back flat and chest up as you drive through your heels to stand tall, then lower with control.',
  },
  {
    id: '4',
    name: 'Pull-ups',
    category: 'strength',
    muscleGroups: ['Back', 'Biceps'],
    difficulty: 'intermediate',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 6,
    instructions: 'Hang from the bar with an overhand grip, hands just outside shoulder width. Pull yourself up until your chin clears the bar, then lower back down under control until arms are fully extended.',
  },
  {
    id: '5',
    name: 'Push-ups',
    category: 'strength',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 15,
    instructions: 'Hands slightly wider than shoulders, body in a straight line from head to heels. Lower your chest to just above the floor, then push back up without letting your hips sag.',
  },
  {
    id: '6',
    name: 'Running',
    category: 'cardio',
    muscleGroups: ['Full Body'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 1,
    defaultDuration: 1200,
    defaultDistance: 3000,
    instructions: 'Keep a relaxed upright posture with a slight forward lean, land midfoot under your hips rather than reaching out with your heel, and settle into a pace you can sustain while still holding a conversation.',
  },
  {
    id: '7',
    name: 'Cycling',
    category: 'cardio',
    muscleGroups: ['Quadriceps', 'Hamstrings', 'Calves'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 1,
    defaultDuration: 1800,
    defaultDistance: 10000,
    instructions: 'Set the seat height so your knee has a slight bend at the bottom of the pedal stroke. Keep a steady cadence and even pressure through the whole pedal circle rather than just stomping down.',
  },
  {
    id: '8',
    name: 'Jumping Rope',
    category: 'cardio',
    muscleGroups: ['Calves', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 3,
    defaultDuration: 60,
    instructions: 'Jump just high enough to clear the rope, landing softly on the balls of your feet. Keep the turns coming from your wrists, not big swings from the shoulders.',
  },
  {
    id: '9',
    name: 'Yoga Flow',
    category: 'flexibility',
    muscleGroups: ['Full Body', 'Core'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 1,
    defaultDuration: 600,
    instructions: 'Move slowly between poses in time with your breath, holding each one for a few breaths. Never force a stretch into pain — ease back if you feel sharp discomfort.',
  },
  {
    id: '10',
    name: 'Standing Hamstring Stretch',
    category: 'flexibility',
    muscleGroups: ['Hamstrings', 'Back'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'Extend one leg out in front with the heel on the ground, toes up. Keeping your back flat, hinge forward at the hips until you feel a stretch along the back of that leg, then hold.',
  },
  {
    id: '11',
    name: 'Plank',
    category: 'strength',
    muscleGroups: ['Core', 'Shoulders', 'Back'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 3,
    defaultDuration: 45,
    instructions: 'Forearms on the ground, elbows under shoulders, body in a straight line from head to heels. Brace your core and squeeze your glutes to keep your hips from sagging or piking up.',
  },
  {
    id: '12',
    name: 'Balance Board Exercise',
    category: 'balance',
    muscleGroups: ['Core', 'Full Body'],
    difficulty: 'intermediate',
    logType: 'time',
    defaultSets: 3,
    defaultDuration: 30,
    instructions: 'Step onto the board with feet shoulder-width apart, knees slightly bent, and eyes fixed on a point ahead of you. Make small, quick adjustments rather than big corrections to stay centered.',
  }
];

// Local database helper functions (to be replaced with actual PostgreSQL implementation)
let localExercises = [...exerciseList];

export const getAllExercises = () => {
  return localExercises;
};

export const getExerciseById = (id: string) => {
  return localExercises.find(exercise => exercise.id === id);
};

export const createExercise = (exercise: Omit<Exercise, 'id'>) => {
  const newExercise = {
    ...exercise,
    id: Math.random().toString(36).substring(2, 9)
  };
  localExercises.push(newExercise);
  return newExercise;
};

export const updateExercise = (id: string, exercise: Partial<Exercise>) => {
  const index = localExercises.findIndex(ex => ex.id === id);
  if (index !== -1) {
    localExercises[index] = { ...localExercises[index], ...exercise };
    return localExercises[index];
  }
  return null;
};

export const deleteExercise = (id: string) => {
  const index = localExercises.findIndex(ex => ex.id === id);
  if (index !== -1) {
    const deleted = localExercises[index];
    localExercises = localExercises.filter(ex => ex.id !== id);
    return deleted;
  }
  return null;
};

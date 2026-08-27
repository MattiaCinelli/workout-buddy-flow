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
  // rather than an open-ended "do 10 reps whenever." Defaults to 5 (see
  // DEFAULT_SECONDS_PER_REP) when unset.
  secondsPerRep?: number;
  defaultWeight?: number; // optional, e.g. a loaded exercise's usual working weight
  defaultDistance?: number; // optional, meters — e.g. a usual run/ride distance
  // Performed one limb at a time — the workout runtime splits every set of
  // this exercise into a Left side then a Right side (with a short "switch
  // sides" pause between), and the presentation layer labels each clearly.
  // Applies to reps- and time-based moves alike (single-arm row, single-leg
  // plank, Bulgarian split squat…).
  unilateral?: boolean;
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

export const DEFAULT_SECONDS_PER_REP = 5;

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
    imageUrl: '/exercises/squat.svg'
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
    imageUrl: '/exercises/bench-press.svg'
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
    imageUrl: '/exercises/hinge.svg'
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
    imageUrl: '/exercises/pull-up.svg'
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
    imageUrl: '/exercises/push-up.svg'
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
    imageUrl: '/exercises/run.svg'
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
    imageUrl: '/exercises/cycle.svg'
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
    imageUrl: '/exercises/jump-rope.svg'
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
    imageUrl: '/exercises/yoga-flow.svg'
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
    imageUrl: '/exercises/stretch-forward-fold.svg'
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
    imageUrl: '/exercises/plank.svg'
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
    imageUrl: '/exercises/balance-board.svg'
  },
  {
    id: '13',
    name: 'Goblet Squat',
    category: 'strength',
    muscleGroups: ['Quadriceps', 'Glutes', 'Core'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 12,
    instructions: 'Hold one dumbbell or kettlebell against your chest with both hands. Sit down and back between your hips, keeping your chest tall and heels planted, until your thighs reach parallel, then stand.',
    imageUrl: '/exercises/squat.svg'
  },
  {
    id: '14',
    name: 'Dumbbell Chest Press',
    category: 'strength',
    muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 10,
    instructions: 'Lie on a bench with a dumbbell in each hand at chest level, elbows about 45 degrees from your body. Press the weights up until your arms are straight, then lower under control.',
    imageUrl: '/exercises/bench-press.svg'
  },
  {
    id: '15',
    name: 'Bent-Over Row',
    category: 'strength',
    muscleGroups: ['Back', 'Biceps'],
    difficulty: 'intermediate',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 12,
    instructions: 'Hinge forward from the hips with a flat back, weight hanging below your shoulders. Pull it toward your lower ribs by driving your elbows back, squeeze the shoulder blades, then lower fully.',
    imageUrl: '/exercises/row.svg'
  },
  {
    id: '16',
    name: 'Dumbbell Shoulder Press',
    category: 'strength',
    muscleGroups: ['Shoulders', 'Triceps'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 7,
    instructions: 'Sit or stand tall with a dumbbell at each shoulder, palms forward. Press straight overhead until your arms are almost locked out without arching your lower back, then lower to ear height.',
    imageUrl: '/exercises/overhead-press.svg'
  },
  {
    id: '17',
    name: 'Romanian Deadlift',
    category: 'strength',
    muscleGroups: ['Hamstrings', 'Glutes', 'Back'],
    difficulty: 'intermediate',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 20,
    instructions: 'Stand with a slight knee bend, weight in front of your thighs. Push your hips straight back to lower the weight along your legs until you feel a hamstring stretch, then drive your hips forward to stand.',
    imageUrl: '/exercises/hinge.svg'
  },
  {
    id: '18',
    name: 'Glute Bridge',
    category: 'strength',
    muscleGroups: ['Glutes', 'Hamstrings', 'Core'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 12,
    instructions: 'Lie on your back, knees bent, feet flat and close to your hips. Squeeze your glutes to lift your hips until your body is straight from knees to shoulders, pause, then lower slowly.',
    imageUrl: '/exercises/glute-bridge.svg'
  },
  {
    id: '19',
    name: 'Dumbbell Lunge',
    category: 'strength',
    muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
    difficulty: 'intermediate',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 8,
    unilateral: true,
    instructions: 'Hold a dumbbell in each hand and step forward into a lunge, lowering until both knees are near 90 degrees. Push through the front heel to return, then complete all reps before switching legs.',
    imageUrl: '/exercises/lunge.svg'
  },
  {
    id: '20',
    name: 'Dumbbell Bicep Curl',
    category: 'strength',
    muscleGroups: ['Biceps', 'Forearms'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 8,
    instructions: 'Stand tall with a dumbbell in each hand, palms forward, elbows tucked by your sides. Curl the weights to your shoulders without swinging, then lower all the way down under control.',
    imageUrl: '/exercises/curl.svg'
  },
  {
    id: '21',
    name: 'Bench Triceps Dip',
    category: 'strength',
    muscleGroups: ['Triceps', 'Chest', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    instructions: 'Hands on the edge of a bench behind you, legs out in front. Bend your elbows straight back to lower your hips toward the floor, then press back up until your arms are straight.',
    imageUrl: '/exercises/dip.svg'
  },
  {
    id: '22',
    name: 'Bodyweight Squat',
    category: 'strength',
    muscleGroups: ['Quadriceps', 'Glutes'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 15,
    instructions: 'Feet shoulder-width apart, arms reaching forward for balance. Sit down and back until your thighs are parallel to the floor, keeping your heels down and chest up, then stand tall.',
    imageUrl: '/exercises/squat.svg'
  },
  {
    id: '23',
    name: 'Mountain Climbers',
    category: 'cardio',
    muscleGroups: ['Core', 'Shoulders', 'Quadriceps'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 20,
    instructions: 'Start in a high plank with hands under your shoulders. Drive one knee toward your chest, then switch legs quickly, keeping your hips low and level. Count one rep per knee drive.',
    imageUrl: '/exercises/core-floor.svg'
  },
  {
    id: '24',
    name: 'Dead Bug',
    category: 'strength',
    muscleGroups: ['Core'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    instructions: 'Lie on your back, arms reaching at the ceiling, knees bent over your hips. Press your lower back into the floor as you slowly extend the opposite arm and leg, then return. Count one rep per side.',
    imageUrl: '/exercises/core-floor.svg'
  },
  {
    id: '25',
    name: 'Bird Dog',
    category: 'strength',
    muscleGroups: ['Core', 'Back', 'Glutes'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 3,
    defaultReps: 10,
    instructions: 'On hands and knees, back flat. Reach one arm forward and the opposite leg back until both are level with your torso, without twisting your hips, pause, then return. Count one rep per side.',
    imageUrl: '/exercises/core-floor.svg'
  },
  {
    id: '26',
    name: 'Side Plank',
    category: 'strength',
    muscleGroups: ['Core', 'Shoulders'],
    difficulty: 'intermediate',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    unilateral: true,
    instructions: 'Lie on your side, forearm under your shoulder, feet stacked. Lift your hips so your body is a straight line and hold, breathing steadily. Do the full hold, then switch sides.',
    imageUrl: '/exercises/plank.svg'
  },
  {
    id: '27',
    name: 'Standing Quad Stretch',
    category: 'flexibility',
    muscleGroups: ['Quadriceps'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    unilateral: true,
    instructions: 'Standing tall, hold a wall for balance. Bend one knee and hold that ankle behind you, keeping your knees together and hips pushed slightly forward until you feel the front of the thigh stretch.',
    imageUrl: '/exercises/stretch-quad.svg'
  },
  {
    id: '28',
    name: 'Seated Forward Fold',
    category: 'flexibility',
    muscleGroups: ['Hamstrings', 'Back'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'Sit with your legs straight out in front. Hinge forward from the hips with a long spine, reaching toward your feet, and stop where you feel a firm but comfortable stretch behind your legs.',
    imageUrl: '/exercises/stretch-forward-fold.svg'
  },
  {
    id: '29',
    name: 'Figure-Four Glute Stretch',
    category: 'flexibility',
    muscleGroups: ['Glutes'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    unilateral: true,
    instructions: 'Lie on your back and cross one ankle over the opposite knee. Reach through and pull the supporting thigh toward your chest until you feel a stretch deep in the crossed-leg glute. Then switch sides.',
    imageUrl: '/exercises/stretch-figure-four.svg'
  },
  {
    id: '30',
    name: 'Kneeling Hip Flexor Stretch',
    category: 'flexibility',
    muscleGroups: ['Quadriceps', 'Glutes'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    unilateral: true,
    instructions: 'Kneel on one knee with the other foot flat in front. Tuck your pelvis under and shift your weight gently forward until you feel a stretch at the front of the kneeling-side hip. Then switch sides.',
    imageUrl: '/exercises/stretch-hip-flexor.svg'
  },
  {
    id: '31',
    name: "Child's Pose",
    category: 'flexibility',
    muscleGroups: ['Back', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 1,
    defaultDuration: 40,
    instructions: 'From hands and knees, sit your hips back toward your heels and walk your hands forward, letting your chest sink toward the floor. Breathe slowly into your back and relax your shoulders.',
    imageUrl: '/exercises/childs-pose.svg'
  },
  {
    id: '32',
    name: 'Cat-Cow Stretch',
    category: 'flexibility',
    muscleGroups: ['Back', 'Core'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 1,
    defaultDuration: 40,
    instructions: 'On hands and knees, slowly alternate between rounding your spine toward the ceiling (cat) and dropping your belly while lifting your chest and tailbone (cow), moving with your breath.',
    imageUrl: '/exercises/cat-cow.svg'
  },
  {
    id: '33',
    name: 'Cobra Stretch',
    category: 'flexibility',
    muscleGroups: ['Core', 'Back'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 25,
    instructions: 'Lie face down, hands under your shoulders. Press gently to lift your chest, keeping your hips on the floor and shoulders down away from your ears, until you feel a light stretch across the front of your torso.',
    imageUrl: '/exercises/cobra.svg'
  },
  {
    id: '34',
    name: 'Downward Dog',
    category: 'flexibility',
    muscleGroups: ['Hamstrings', 'Calves', 'Shoulders', 'Back'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'From hands and knees, tuck your toes and lift your hips up and back into an inverted V. Press the floor away, lengthen your spine, and let your heels sink toward the ground.',
    imageUrl: '/exercises/downward-dog.svg'
  },
  {
    id: '35',
    name: 'Chest Doorway Stretch',
    category: 'flexibility',
    muscleGroups: ['Chest', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'Stand in a doorway with your forearms on the frame, elbows at shoulder height. Step one foot through and lean forward gently until you feel a stretch across the front of your chest and shoulders.',
    imageUrl: '/exercises/stretch-chest.svg'
  },
  {
    id: '36',
    name: 'Cross-Body Shoulder Stretch',
    category: 'flexibility',
    muscleGroups: ['Shoulders'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 20,
    unilateral: true,
    instructions: 'Bring one arm straight across your body at chest height. Use the other hand to draw it closer until you feel a stretch in the back of that shoulder, keeping the shoulder down. Then switch arms.',
    imageUrl: '/exercises/stretch-arm-across.svg'
  },
  {
    id: '37',
    name: 'Standing Calf Stretch',
    category: 'flexibility',
    muscleGroups: ['Calves'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    unilateral: true,
    instructions: 'Facing a wall, step one foot well back with the heel down and knee straight. Lean into the wall until you feel a stretch in the back-leg calf, then switch sides.',
    imageUrl: '/exercises/stretch-calf.svg'
  },
  {
    id: '38',
    name: 'Neck Release',
    category: 'flexibility',
    muscleGroups: ['Shoulders'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 20,
    unilateral: true,
    instructions: 'Sitting or standing tall, gently tip one ear toward that shoulder, letting the weight of your hand rest on your head for a light stretch down the side of your neck. Ease off slowly, then switch sides.',
    imageUrl: '/exercises/stretch-neck.svg'
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

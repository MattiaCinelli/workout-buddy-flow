export type ExerciseLogType = 'reps' | 'time';
export const EXECUTION_DIRECTIONS = ['left', 'right', 'forward', 'backward'] as const;
export type ExecutionDirection = (typeof EXECUTION_DIRECTIONS)[number];
export const EXECUTION_DIRECTION_LABELS: Record<ExecutionDirection, string> = {
  left: 'Left', right: 'Right', forward: 'Forward', backward: 'Backward',
};

export interface ExerciseProgression {
  // 'linear' — add weight every session all target reps are hit.
  // 'double' — climb the rep range first, then add weight and reset to the
  // bottom of the range.
  mode: 'linear' | 'double';
  incrementKg?: number;  // weight step; defaults to DEFAULT_PROGRESSION_INCREMENT_KG
  repRangeMin?: number;  // 'double' only
  repRangeMax?: number;  // 'double' only
}

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
  // Directions to create as separate, visible sets when this exercise is
  // added to a workout. `unilateral` remains as a legacy left/right fallback
  // for exercises created before this field existed.
  executionDirections?: ExecutionDirection[];
  // Opt-in load progression. When set, the app suggests the next target
  // from your logged history (see src/lib/progression.ts) — it never
  // changes the workout template, only advises.
  progression?: ExerciseProgression;
  instructions?: string; // How to perform it — shown to the user browsing the library and during a workout
  // An https:// link to a video demonstrating the movement. Opened in a new
  // tab from the library and reachable from a small icon during a guided
  // workout. Constrained to https: on input and when importing a shared file.
  videoUrl?: string;
  imageUrl?: string; // URL to the local image
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // sync tombstone — set by useIndexedDBCollection on delete while a sync server is connected; offline deletes hard-remove the row instead
}

export const getExecutionDirections = (
  exercise: Pick<Exercise, 'executionDirections' | 'unilateral'>,
): ExecutionDirection[] => exercise.executionDirections?.length
  ? exercise.executionDirections
  : exercise.unilateral ? ['left', 'right'] : [];

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
    imageUrl: '/exercises/squat.svg',
    progression: { mode: 'linear', incrementKg: 2.5 }
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
    imageUrl: '/exercises/bench-press.svg',
    progression: { mode: 'linear', incrementKg: 2.5 }
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
    imageUrl: '/exercises/hinge.svg',
    progression: { mode: 'linear', incrementKg: 5 }
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
    name: 'Hamstring stretch',
    category: 'flexibility',
    muscleGroups: ['Hamstrings'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Sit tall with one leg extended and the other knee comfortably bent. Keep the extended knee soft rather than locked, hinge forward from your hips with a long spine, and stop when you feel a gentle stretch along the back of the extended leg.',
    videoUrl: 'https://www.dvidshub.net/video/774072/seated-straddle-stretch-fitness-workout',
    imageUrl: 'private-exercise:mobility-hamstring-stretch.jpg'
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
    imageUrl: '/exercises/squat.svg',
    progression: { mode: 'double', incrementKg: 2, repRangeMin: 8, repRangeMax: 12 }
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
    imageUrl: '/exercises/hinge.svg',
    progression: { mode: 'double', incrementKg: 2.5, repRangeMin: 8, repRangeMax: 12 }
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
    videoUrl: 'https://www.youtube.com/watch?v=Qfy-Qt295Bc',
    imageUrl: 'private-exercise:mobility-seated-forward-fold.jpg'
  },
  {
    id: '29',
    name: 'Figure-4 stretch',
    category: 'flexibility',
    muscleGroups: ['Glutes', 'Hips'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Lie on your back with both knees bent. Cross one ankle over the opposite thigh, flex the crossed foot, then draw the uncrossed thigh toward your chest. Keep your head and shoulders relaxed and stop at a comfortable stretch in the crossed-leg glute.',
    videoUrl: 'https://neilcraton.com/2016/11/27/figure-4-stretch/',
    imageUrl: 'private-exercise:mobility-figure-four.jpg'
  },
  {
    id: '30',
    name: 'Half-kneeling hip-flexor stretch',
    category: 'flexibility',
    muscleGroups: ['Hip Flexors', 'Quadriceps', 'Glutes'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Kneel on one knee with the other foot forward and both knees near 90 degrees. Gently tuck your pelvis, squeeze the glute of the kneeling side and shift forward only until you feel the stretch at the front of that hip. Keep your ribs stacked over your pelvis.',
    videoUrl: 'https://www.youtube.com/watch?v=gqoPYLUgP48',
    imageUrl: 'private-exercise:mobility-half-kneeling-hip-flexor.jpg'
  },
  {
    id: '31',
    name: "Child's Pose",
    category: 'flexibility',
    muscleGroups: ['Back', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'From hands and knees, sit your hips toward your heels while reaching both arms long in front. Keep your palms down, let your chest soften toward the mat and breathe into the sides of your ribs. Stop or add support if the position pinches your shoulders or knees.',
    videoUrl: 'https://body-works.ca/physio-video/modified-child-pose-stretch-for-shoulder-opening/',
    imageUrl: 'private-exercise:mobility-childs-pose.jpg'
  },
  {
    id: '32',
    name: 'Cat-cow',
    category: 'flexibility',
    muscleGroups: ['Back', 'Core'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 2,
    defaultReps: 13,
    secondsPerRep: 5,
    instructions: 'Start on hands and knees with wrists under shoulders and knees under hips. Inhale as you gently drop your belly, lift your chest and tailbone, then exhale as you press the floor away, round your spine and tuck your chin. Move smoothly through a comfortable range.',
    videoUrl: 'https://www.youtube.com/watch?v=r8mZstM7C88',
    imageUrl: 'private-exercise:mobility-cat-cow.jpg'
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
    videoUrl: 'https://wellilo.com/blog/how-to-get-your-heels-to-the-floor-in-downward-dog',
    imageUrl: 'private-exercise:mobility-downward-dog.jpg'
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
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Bring one arm straight across your body at chest height. Use the other hand to draw it closer until you feel a stretch in the back of that shoulder, keeping the shoulder down. Then switch arms.',
    videoUrl: 'https://ota.org/for-patients/physical-therapy/shoulder',
    imageUrl: 'private-exercise:mobility-cross-body-shoulder.jpg'
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
    executionDirections: ['left', 'right'],
    instructions: 'Facing a wall, step one foot well back with the heel down and knee straight. Lean into the wall until you feel a stretch in the back-leg calf, then switch sides.',
    videoUrl: 'https://www.merckmanuals.com/professional/multimedia/video/standing-gastrocnemius-stretch',
    imageUrl: 'private-exercise:mobility-standing-calf.jpg'
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
  },
  {
    id: 'mobility-open-book-rotations',
    name: 'Open-book rotations',
    category: 'flexibility',
    muscleGroups: ['Back', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 2,
    defaultReps: 13,
    secondsPerRep: 5,
    executionDirections: ['left', 'right'],
    instructions: 'Lie on your side with hips and knees bent and arms reaching forward together. Keep your knees stacked while sweeping the top arm across your body and rotating through your upper back. Follow the hand with your eyes, pause without forcing the shoulder down, then return with control.',
    videoUrl: 'https://www.youtube.com/watch?v=Gt7nH2U9LVU',
    imageUrl: 'private-exercise:mobility-open-book.jpg'
  },
  {
    id: 'mobility-deep-squat-hold',
    name: 'Deep squat hold',
    category: 'flexibility',
    muscleGroups: ['Ankles', 'Hips', 'Glutes', 'Quadriceps'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'Stand with feet about shoulder-width apart and toes turned out slightly. Sit straight down between your feet, keeping your heels grounded and knees tracking with your toes. Hold a post or doorframe for balance if needed, stay tall, and breathe without forcing depth.',
    videoUrl: 'https://integrativephysicaltherapyservices.com/yoga-crossfit-bellingham-cant-deep-squat/',
    imageUrl: 'private-exercise:mobility-deep-squat-hold.jpg'
  },
  {
    id: 'mobility-frog-stretch',
    name: 'Frog stretch',
    category: 'flexibility',
    muscleGroups: ['Inner Thighs', 'Groin', 'Hips'],
    difficulty: 'intermediate',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'Begin on hands and knees, then slide your knees apart with knees bent and lower legs pointing outward. Keep your ankles roughly in line with your knees, brace gently, and ease your hips backward until you feel a stretch through the inner thighs. Support yourself on hands or forearms.',
    videoUrl: 'https://www.truecorecoaching.com/blog/what-are-the-mobility-routine-that-i-can-do-at-home',
    imageUrl: 'private-exercise:mobility-frog-stretch.jpg'
  },
  {
    id: 'mobility-butterfly-stretch',
    name: 'Butterfly',
    category: 'flexibility',
    muscleGroups: ['Groin', 'Inner Thighs', 'Hips'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'Sit tall and bring the soles of your feet together, allowing your knees to fall outward. Hold your feet or ankles, keep your spine long and hinge slightly forward from the hips. Let gravity lower the knees; do not press or bounce them down.',
    videoUrl: 'https://www.truecorecoaching.com/blog/what-are-the-mobility-routine-that-i-can-do-at-home',
    imageUrl: 'private-exercise:mobility-butterfly.jpg'
  },
  {
    id: 'mobility-puppy-pose',
    name: 'Puppy pose',
    category: 'flexibility',
    muscleGroups: ['Shoulders', 'Back'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'Start on hands and knees with hips above knees. Walk your hands forward, keep your arms active, and melt your chest gently toward the floor while your hips stay stacked. Rest your forehead on support if needed and avoid collapsing into your lower back.',
    videoUrl: 'https://fitloop.app/exercises/puppy-pose',
    imageUrl: 'private-exercise:mobility-puppy-pose.jpg'
  },
  {
    id: 'mobility-supported-straddle',
    name: 'Supported straddle',
    category: 'flexibility',
    muscleGroups: ['Inner Thighs', 'Hamstrings', 'Hips'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    instructions: 'Sit on a folded towel or cushion with your legs comfortably wide and knees facing upward. Place your hands on the floor or a chair for support, lengthen your spine, and hinge forward from the hips only as far as you can keep control. Do not force the knees flat.',
    videoUrl: 'https://www.dvidshub.net/video/774072/seated-straddle-stretch-fitness-workout',
    imageUrl: 'private-exercise:mobility-supported-straddle.jpg'
  },
  {
    id: 'mobility-cossack-squat',
    name: 'Cossack squat',
    category: 'flexibility',
    muscleGroups: ['Hips', 'Inner Thighs', 'Quadriceps', 'Glutes', 'Ankles'],
    difficulty: 'intermediate',
    logType: 'reps',
    defaultSets: 2,
    defaultReps: 13,
    secondsPerRep: 5,
    instructions: 'Take a wide stance with toes slightly turned out. Shift your weight to one side, bending that knee while keeping the other leg long and its heel grounded; let the straight-leg toes lift if comfortable. Keep your chest tall, push through the bent-leg foot to return, then alternate sides. Count one left-and-right cycle as one repetition.',
    videoUrl: 'https://www.youtube.com/watch?v=nLNqEQ4B6XI',
    imageUrl: 'private-exercise:mobility-cossack-squat.jpg'
  },
  {
    id: 'mobility-straight-leg-raises',
    name: 'Straight-leg raises',
    category: 'flexibility',
    muscleGroups: ['Hamstrings', 'Hip Flexors', 'Core', 'Quadriceps'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 2,
    defaultReps: 13,
    secondsPerRep: 4,
    executionDirections: ['left', 'right'],
    instructions: 'Lie on your back with one knee bent and the working leg straight. Brace gently, tighten the front of the straight thigh and raise that leg without bending the knee or arching your lower back. Pause briefly, then lower slowly with control.',
    videoUrl: 'https://www.southtees.nhs.uk/resources/straight-leg-raise/',
    imageUrl: 'private-exercise:mobility-straight-leg-raise.jpg'
  },
  {
    id: 'mobility-90-90-hip-switches',
    name: '90/90 Hip Switches',
    category: 'flexibility',
    muscleGroups: ['Hips', 'Glutes', 'Groin'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 2,
    defaultReps: 13,
    secondsPerRep: 5,
    instructions: 'Sit with both knees bent and feet wider than your hips. Keep your chest tall as you lower both knees together toward one side, arriving in a 90/90 shape, then return through the middle and rotate to the other side. Move only through a controlled, pain-free range and count one left-and-right cycle as one repetition.',
    videoUrl: 'https://www.youtube.com/watch?v=HUZimFZJZWU',
    imageUrl: 'private-exercise:mobility-90-90-hip-switch.jpg'
  },
  {
    id: 'mobility-pigeon-pose',
    name: 'Pigeon Pose',
    category: 'flexibility',
    muscleGroups: ['Glutes', 'Hips', 'Hip Flexors'],
    difficulty: 'intermediate',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'From hands and knees, bring one knee behind the same-side wrist and angle that shin comfortably across the mat. Extend the other leg behind you, keep your hips supported and as level as practical, and stay lifted on your hands or lower only if comfortable. Avoid forcing the front shin parallel or placing pressure on the knee.',
    videoUrl: 'https://yoga.org/videos/pigeon-pose-for-beginners-dos-donts-of-eka-pada-kapotasana-arh-LaUNv8',
    imageUrl: 'private-exercise:mobility-pigeon-pose.jpg'
  },
  {
    id: 'mobility-single-leg-deadlift-stretch',
    name: 'Single-Leg Deadlift-Position Stretch',
    category: 'flexibility',
    muscleGroups: ['Hamstrings', 'Glutes', 'Calves'],
    difficulty: 'intermediate',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Stand beside a wall for support with your weight on one leg and a soft bend in that knee. Hinge from the hip while reaching the other leg behind you, keeping your hips square and spine long. Stop when you feel a controlled stretch along the standing-leg hamstring; do not twist or round to reach lower.',
    videoUrl: 'https://www.pogophysio.com.au/blog/single-leg-deadlift-hamstring-recovery/',
    imageUrl: 'private-exercise:mobility-single-leg-deadlift-stretch.jpg'
  },
  {
    id: 'mobility-reclined-hamstring-strap',
    name: 'Reclined Hamstring Stretch with Strap',
    category: 'flexibility',
    muscleGroups: ['Hamstrings', 'Calves'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Lie on your back and loop a strap or towel around the arch of one foot. Keep the other leg comfortably bent or long on the floor, then use the strap to raise the working leg until you feel a gentle stretch behind the thigh. Keep your pelvis heavy and allow a small knee bend rather than forcing the leg straight.',
    videoUrl: 'https://www.southtees.nhs.uk/resources/hamstring-stretch-1/',
    imageUrl: 'private-exercise:mobility-reclined-hamstring-strap.jpg'
  },
  {
    id: 'mobility-side-lunge-hold',
    name: 'Side Lunge Hold',
    category: 'flexibility',
    muscleGroups: ['Inner Thighs', 'Groin', 'Hips', 'Quadriceps'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Take a wide stance with both feet grounded. Shift your hips toward one side and bend that knee while keeping the opposite leg long, the bent knee tracking with its toes and your chest lifted. Hold where you feel a comfortable stretch along the inner thigh of the straight leg.',
    videoUrl: 'https://www.youtube.com/watch?v=nV3RsHokRqw',
    imageUrl: 'private-exercise:mobility-side-lunge-hold.jpg'
  },
  {
    id: 'mobility-doorframe-lat-stretch',
    name: 'Doorframe Lat Stretch',
    category: 'flexibility',
    muscleGroups: ['Back', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Hold a sturdy doorframe with one hand around chest-to-shoulder height. Step back and send your hips away while keeping that arm long and your spine neutral. Gently rotate your chest away until you feel the stretch from the side of your shoulder down through your lat; keep the shoulder away from your ear.',
    videoUrl: 'https://www.peak-physio.com.au/exercise/doorway-lat-stretch/',
    imageUrl: 'private-exercise:mobility-doorframe-lat-stretch.jpg'
  },
  {
    id: 'mobility-sleeper-stretch',
    name: 'Sleeper Stretch',
    category: 'flexibility',
    muscleGroups: ['Shoulders'],
    difficulty: 'intermediate',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Lie on your side with the lower shoulder and elbow near 90 degrees and the forearm pointing upward. Keep the shoulder blade settled, then use the top hand to guide the lower forearm forward only until a mild stretch is felt at the back of the shoulder. Use very light pressure and stop if you feel pinching at the front of the joint.',
    videoUrl: 'https://www.orthobullets.com/video/view?id=613',
    imageUrl: 'private-exercise:mobility-sleeper-stretch.jpg'
  },
  {
    id: 'mobility-knee-to-wall',
    name: 'Knee-to-Wall Ankle Mobilization',
    category: 'flexibility',
    muscleGroups: ['Ankles', 'Calves'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 2,
    defaultReps: 13,
    secondsPerRep: 3,
    executionDirections: ['left', 'right'],
    instructions: 'Face a wall in a split stance with the working foot flat and pointing straight ahead. Slowly drive that knee toward the wall over the second and third toes without letting the heel lift or the arch collapse, then return under control. Adjust the foot distance so every repetition stays smooth.',
    videoUrl: 'https://www.youtube.com/watch?v=YF7qaAbd0q8',
    imageUrl: 'private-exercise:mobility-knee-to-wall.jpg'
  },
  {
    id: 'mobility-bent-knee-soleus-stretch',
    name: 'Bent-Knee Soleus Stretch',
    category: 'flexibility',
    muscleGroups: ['Calves', 'Ankles'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Face a wall with both hands supported and step one foot behind you. Keep the back heel down and toes pointing forward, then bend both knees and gently sink forward until you feel the stretch lower in the back calf. Keep the rear arch lifted and do not let the knee collapse inward.',
    videoUrl: 'https://www.merckmanuals.com/en-ca/home/multimedia/video/standing-soleus-stretch',
    imageUrl: 'private-exercise:mobility-bent-knee-soleus.jpg'
  },
  {
    id: 'mobility-downward-dog-heel-pumps',
    name: 'Downward Dog with Heel Pumps',
    category: 'flexibility',
    muscleGroups: ['Calves', 'Hamstrings', 'Shoulders', 'Back'],
    difficulty: 'beginner',
    logType: 'reps',
    defaultSets: 2,
    defaultReps: 13,
    secondsPerRep: 4,
    instructions: 'Begin in downward-facing dog with hands grounded and hips high. Bend one knee while lengthening the opposite leg and reaching that heel toward the floor, then switch sides without rocking your shoulders forward. Keep pressing the floor away and count one right-and-left pump as one repetition.',
    videoUrl: 'https://wellilo.com/blog/how-to-get-your-heels-to-the-floor-in-downward-dog',
    imageUrl: 'private-exercise:mobility-downward-dog-heel-pumps.jpg'
  },
  {
    id: 'mobility-thread-the-needle',
    name: 'Thread the Needle',
    category: 'flexibility',
    muscleGroups: ['Back', 'Shoulders'],
    difficulty: 'beginner',
    logType: 'time',
    defaultSets: 2,
    defaultDuration: 30,
    executionDirections: ['left', 'right'],
    instructions: 'Start on hands and knees. Slide one arm palm-up beneath the other, rotating through your upper back until that shoulder and the side of your head rest lightly on the mat. Keep your hips over your knees, breathe into the upper back and avoid loading your neck.',
    videoUrl: 'https://www.youtube.com/watch?v=SkQhKf74nZk',
    imageUrl: 'private-exercise:mobility-thread-the-needle.jpg'
  },
  {
    id: 'mobility-foam-roller-thoracic-extension',
    name: 'Foam-Roller Thoracic Extension',
    category: 'flexibility',
    muscleGroups: ['Back', 'Shoulders'],
    difficulty: 'intermediate',
    logType: 'reps',
    defaultSets: 2,
    defaultReps: 13,
    secondsPerRep: 5,
    instructions: 'Lie face-up with knees bent and a foam roller across your mid-upper back. Support your head without pulling it, keep your ribs controlled and gently extend your upper back over the roller, then return to neutral. Reposition the roller slightly between repetitions if desired; avoid rolling onto the neck or low back.',
    videoUrl: 'https://www.youtube.com/watch?v=9Y11Kc0E0og',
    imageUrl: 'private-exercise:mobility-foam-roller-thoracic-extension.jpg'
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

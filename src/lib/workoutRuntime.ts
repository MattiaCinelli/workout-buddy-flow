import { WorkoutEntry } from '@/data/workoutHistory';
import { Exercise, getSecondsPerRep } from '@/data/exercises';

// Seconds given at the very start of a workout before the first exercise
// begins, so the person has time to get into position after tapping Start.
export const PREP_DURATION_SECONDS = 10;

// A short breather between sets of the SAME exercise reads very
// differently than the longer transition needed to get set up for a
// DIFFERENT exercise — these are genuinely different kinds of rest, not
// one setting doing double duty.
export const DEFAULT_REST_BETWEEN_SETS = 5;
export const DEFAULT_REST_BETWEEN_EXERCISES = 15;

// The brief pause inserted between the left and right side of a unilateral
// set — just long enough to reset position and switch limbs.
export const SWITCH_SIDES_DURATION_SECONDS = 5;

export type WorkoutStep = { type: 'exercise' | 'rest'; exerciseId?: string; sourceSetIndex?: number;
  setIndex?: number; duration?: number; reps?: number; weight?: number; distance?: number;
  // Set only for reps-based exercise steps — lets the presentation layer
  // announce which rep it's on as the (synthesized) countdown ticks past
  // each secondsPerRep-sized interval.
  secondsPerRep?: number;
  // Set on the two exercise steps a unilateral set expands into, so the
  // presentation layer can make clear which limb to work now.
  side?: 'left' | 'right';
  // 'prep' is the leading "get in position" pause; 'switch' is the short
  // changeover between the two sides of a unilateral set; 'rest' is an
  // ordinary between-sets rest. Same countdown mechanics, different heading
  // and announcement in the presentation layer.
  kind?: 'prep' | 'rest' | 'switch' };

// A rep-based set has no natural duration of its own — it's built here so
// reps and timed exercises can share one countdown mechanism ("follow
// along" pacing) instead of reps being an open-ended, un-timed pause.
export const buildWorkoutSteps = (workout: WorkoutEntry, exercises: Exercise[] = []): WorkoutStep[] => {
  const steps: WorkoutStep[] = [{ type: 'rest', duration: PREP_DURATION_SECONDS, kind: 'prep' }];
  workout.sets.forEach((set, sourceSetIndex) => {
    const setIndex = workout.sets.slice(0, sourceSetIndex + 1)
      .filter(candidate => candidate.exerciseId === set.exerciseId).length - 1;
    const isReps = set.reps !== undefined;
    const exercise = exercises.find(item => item.id === set.exerciseId);
    const secondsPerRep = isReps ? getSecondsPerRep(exercise ?? {}) : undefined;
    const duration = isReps ? (secondsPerRep! * set.reps!) : set.duration;
    const exerciseStep: WorkoutStep = { type: 'exercise', exerciseId: set.exerciseId, sourceSetIndex,
      setIndex, reps: set.reps, weight: set.weight, duration, distance: set.distance, secondsPerRep };
    if (exercise?.unilateral) {
      // One authored set becomes: left side → switch pause → right side.
      // Both sides keep the same sourceSetIndex/setIndex so progress
      // counting and results logging still map back to the one authored set.
      steps.push({ ...exerciseStep, side: 'left' });
      steps.push({ type: 'rest', kind: 'switch', duration: SWITCH_SIDES_DURATION_SECONDS });
      steps.push({ ...exerciseStep, side: 'right' });
    } else {
      steps.push(exerciseStep);
    }
    const next = workout.sets[sourceSetIndex + 1];
    if (next) steps.push({ type: 'rest', kind: 'rest', duration: set.restAfter ??
      (next.exerciseId === set.exerciseId
        ? (workout.restBetweenSets ?? DEFAULT_REST_BETWEEN_SETS)
        : (workout.restBetweenExercises ?? DEFAULT_REST_BETWEEN_EXERCISES)) });
  });
  return steps;
};

export const remainingSeconds = (deadline: number, now = Date.now()) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

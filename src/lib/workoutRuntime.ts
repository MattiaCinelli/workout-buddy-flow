import { WorkoutEntry } from '@/data/workoutHistory';
import { Exercise, getSecondsPerRep } from '@/data/exercises';

// Seconds given at the very start of a workout before the first exercise
// begins, so the person has time to get into position after tapping Start.
export const PREP_DURATION_SECONDS = 10;

// A short breather between sets of the SAME exercise reads very
// differently than the longer transition needed to get set up for a
// DIFFERENT exercise — these are genuinely different kinds of rest, not
// one setting doing double duty.
export const DEFAULT_REST_BETWEEN_SETS = 10;
export const DEFAULT_REST_BETWEEN_EXERCISES = 30;

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
  // Carried from the authored set for the presentation layer.
  warmup?: boolean;
  amrap?: boolean;
  // 'prep' is the leading "get in position" pause; 'switch' is the short
  // changeover between the two sides of a unilateral set; 'rest' is an
  // ordinary between-sets rest. Same countdown mechanics, different heading
  // and announcement in the presentation layer.
  kind?: 'prep' | 'rest' | 'switch';
  // On a 'rest' step: true when the NEXT exercise differs from the one just
  // finished (a between-exercises transition), false when it's another set
  // of the same exercise. Drives the longer default rest, a distinct spoken
  // cue ("Rest, changing exercise") and the on-screen label.
  changesExercise?: boolean };

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
      setIndex, reps: set.reps, weight: set.weight, duration, distance: set.distance, secondsPerRep,
      warmup: set.warmup, amrap: set.amrap };
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
    if (next) {
      const changesExercise = next.exerciseId !== set.exerciseId;
      steps.push({ type: 'rest', kind: 'rest', changesExercise, duration: set.restAfter ??
        (changesExercise
          ? (workout.restBetweenExercises ?? DEFAULT_REST_BETWEEN_EXERCISES)
          : (workout.restBetweenSets ?? DEFAULT_REST_BETWEEN_SETS)) });
    }
  });
  return steps;
};

export const remainingSeconds = (deadline: number, now = Date.now()) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

// --- how the presentation layer should treat a given step ------------------

// A reps-based exercise (secondsPerRep is set) is self-paced: no countdown
// clock, no progress bar, no spoken cue past "Begin", and it never
// auto-advances — the user does their reps and presses Next. Everything
// else (rests, the prep/switch pauses, and genuinely *timed* exercises)
// runs a real countdown and auto-advances when it hits zero.
export const isSelfPacedStep = (step: WorkoutStep | undefined): boolean =>
  step?.type === 'exercise' && !!step.secondsPerRep;

// A short, screen-free label for what kind of rest this is — so someone
// not looking at the phone knows whether to just breathe, switch limbs, or
// move to a new station. Mirrors the spoken cue.
export const restKindLabel = (step: WorkoutStep | undefined): string => {
  if (step?.kind === 'prep') return 'Get ready';
  if (step?.kind === 'switch') return 'Change side';
  if (step?.changesExercise) return 'Rest — next exercise';
  return 'Rest';
};

// Seconds to run a countdown for when this step starts. 0 means "no clock"
// — the step just sits until the user advances it.
export const stepClockSeconds = (step: WorkoutStep | undefined): number =>
  step && !isSelfPacedStep(step) ? (step.duration ?? 0) : 0;

// The single phrase spoken (once) when the step becomes active. For a
// between-exercises rest the caller can pass the next exercise's name so
// the cue also says what's coming up.
export const stepStartAnnouncement = (step: WorkoutStep | undefined, nextExerciseName?: string): string => {
  if (step?.type === 'exercise') return step.side ? `Begin ${step.side} side` : 'Begin';
  if (step?.kind === 'prep') return 'Get ready';
  if (step?.kind === 'switch') return 'Change side';
  if (step?.changesExercise) {
    return nextExerciseName ? `Rest, changing exercise. Next up: ${nextExerciseName}` : 'Rest, changing exercise';
  }
  return 'Rest';
};

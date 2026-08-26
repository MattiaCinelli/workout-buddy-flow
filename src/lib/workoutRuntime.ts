import { WorkoutEntry } from '@/data/workoutHistory';
import { Exercise, getSecondsPerRep } from '@/data/exercises';

// Seconds given at the very start of a workout before the first exercise
// begins, so the person has time to get into position after tapping Start.
export const PREP_DURATION_SECONDS = 10;

export type WorkoutStep = { type: 'exercise' | 'rest'; exerciseId?: string; sourceSetIndex?: number;
  setIndex?: number; duration?: number; reps?: number; weight?: number; distance?: number;
  // Set only for reps-based exercise steps — lets the presentation layer
  // announce which rep it's on as the (synthesized) countdown ticks past
  // each secondsPerRep-sized interval.
  secondsPerRep?: number;
  // Distinguishes the leading "get in position" pause from an ordinary
  // between-sets rest — same countdown mechanics, different announcement
  // and heading text in the presentation layer.
  kind?: 'prep' | 'rest' };

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
    steps.push({ type: 'exercise', exerciseId: set.exerciseId, sourceSetIndex, setIndex,
      reps: set.reps, weight: set.weight, duration, distance: set.distance, secondsPerRep });
    const next = workout.sets[sourceSetIndex + 1];
    if (next) steps.push({ type: 'rest', kind: 'rest', duration: set.restAfter ??
      (next.exerciseId === set.exerciseId ? 30 : (workout.restBetweenExercises ?? 30)) });
  });
  return steps;
};

export const remainingSeconds = (deadline: number, now = Date.now()) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

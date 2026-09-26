import { Exercise, getLogType } from '@/data/exercises';
import { WorkoutSet } from '@/data/workoutHistory';

const range = (values: number[], format: (value: number) => string): string | null => {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? format(min) : `${format(min).replace(/\D+$/, '')}–${format(max)}`;
};

// "5 × 10s holds"; ranges when sets differ, e.g. "4–5 × 10s holds".
const holdsText = (holds: number[], seconds: number[]): string | null => {
  const count = range(holds, value => `${value}`);
  const each = range(seconds, value => `${value}s`);
  return count && each ? `${count} × ${each} holds` : count ? `${count} holds` : each ? `${each} holds` : null;
};

/** One-line description of the planned sets, e.g. "3 sets · 10 reps · 12 kg". */
export const summarizeSets = (exercise: Exercise, sets: WorkoutSet[]): string => {
  const defined = (key: 'reps' | 'duration' | 'weight') =>
    sets.map(set => set[key]).filter((value): value is number => typeof value === 'number' && value > 0);
  return [
    `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}`,
    getLogType(exercise) === 'holds'
      ? holdsText(defined('reps'), defined('duration'))
      : getLogType(exercise) === 'reps'
        ? range(defined('reps'), value => `${value} reps`)
        : range(defined('duration'), value => `${value}s`),
    range(defined('weight'), value => `${value} kg`),
  ].filter(Boolean).join(' · ');
};

/** An exercise's default per-set target: "13 reps", "30s" or "5 holds of 10s"; null when unset. */
export const exerciseTargetText = (exercise: Exercise): string | null => {
  switch (getLogType(exercise)) {
    case 'time': return exercise.defaultDuration ? `${exercise.defaultDuration}s` : null;
    case 'holds': return exercise.defaultReps
      ? `${exercise.defaultReps} holds${exercise.defaultDuration ? ` of ${exercise.defaultDuration}s` : ''}`
      : null;
    default: return exercise.defaultReps ? `${exercise.defaultReps} reps` : null;
  }
};

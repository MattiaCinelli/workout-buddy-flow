import { Exercise, getLogType } from '@/data/exercises';
import { WorkoutSet } from '@/data/workoutHistory';

const range = (values: number[], format: (value: number) => string): string | null => {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? format(min) : `${format(min).replace(/\D+$/, '')}–${format(max)}`;
};

/** One-line description of the planned sets, e.g. "3 sets · 10 reps · 12 kg". */
export const summarizeSets = (exercise: Exercise, sets: WorkoutSet[]): string => {
  const defined = (key: 'reps' | 'duration' | 'weight') =>
    sets.map(set => set[key]).filter((value): value is number => typeof value === 'number' && value > 0);
  return [
    `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}`,
    getLogType(exercise) === 'reps'
      ? range(defined('reps'), value => `${value} reps`)
      : range(defined('duration'), value => `${value}s`),
    range(defined('weight'), value => `${value} kg`),
  ].filter(Boolean).join(' · ');
};

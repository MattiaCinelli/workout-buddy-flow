import { Exercise } from '@/data/exercises';
import { ExerciseSessionEntry } from '@/lib/exerciseHistory';

// A suggestion layer, not a program engine. Given an exercise's opt-in
// progression policy, the set the template prescribes, and the logged
// history for that exercise, it proposes the next target. It reads only —
// nothing here writes a template or a session.

export const DEFAULT_PROGRESSION_INCREMENT_KG = 2.5;
const DELOAD_FACTOR = 0.9;
const DELOAD_AFTER_MISSED_SESSIONS = 2;

const roundToStep = (value: number, step: number): number =>
  step > 0 ? Math.round(value / step) * step : value;

export interface ProgressionSuggestion {
  weight?: number;
  reps?: number;
  /** One-line human rationale, e.g. "Hit all 8 reps last time — add 2.5 kg." */
  note: string;
}

interface PlannedTarget {
  reps?: number;
  weight?: number;
}

// `history` is newest-first with warm-ups already excluded (as returned by
// exerciseSessionHistory). Returns null when there's nothing to suggest:
// no policy, not a weighted-reps set, or no history yet.
export const suggestNextSet = (
  exercise: Exercise,
  planned: PlannedTarget,
  history: ExerciseSessionEntry[],
): ProgressionSuggestion | null => {
  const policy = exercise.progression;
  if (!policy || planned.reps === undefined || planned.weight === undefined || history.length === 0) return null;

  const increment = policy.incrementKg && policy.incrementKg > 0
    ? policy.incrementKg : DEFAULT_PROGRESSION_INCREMENT_KG;
  const targetReps = planned.reps;
  const targetWeight = planned.weight;

  const sessionHit = (entry: ExerciseSessionEntry | undefined, reps: number, weight: number): boolean =>
    !!entry && entry.sets.length > 0
    && entry.sets.every(set => (set.reps ?? 0) >= reps && (set.weight ?? 0) >= weight - 1e-9);

  if (policy.mode === 'linear') {
    if (sessionHit(history[0], targetReps, targetWeight)) {
      const next = roundToStep(targetWeight + increment, increment);
      return { weight: next, reps: targetReps, note: `Hit all ${targetReps} reps last time — add ${increment} kg.` };
    }
    const missedTwice = history.length >= DELOAD_AFTER_MISSED_SESSIONS
      && !sessionHit(history[1], targetReps, targetWeight);
    if (missedTwice) {
      const deload = roundToStep(targetWeight * DELOAD_FACTOR, increment);
      return { weight: deload, reps: targetReps, note: `Missed the target twice — back off to ${deload} kg and build up.` };
    }
    return { weight: targetWeight, reps: targetReps, note: `Repeat ${targetWeight} kg — you fell short of ${targetReps} reps last time.` };
  }

  // double progression
  const rangeMin = policy.repRangeMin ?? targetReps;
  const rangeMax = Math.max(policy.repRangeMax ?? targetReps, rangeMin);
  if (sessionHit(history[0], rangeMax, targetWeight)) {
    const next = roundToStep(targetWeight + increment, increment);
    return { weight: next, reps: rangeMin, note: `Hit ${rangeMax} on every set — add ${increment} kg, back to ${rangeMin} reps.` };
  }
  const lastBest = Math.max(0, ...history[0].sets.map(set => set.reps ?? 0));
  const nextReps = Math.min(rangeMax, Math.max(rangeMin, lastBest + 1));
  return { weight: targetWeight, reps: nextReps, note: `Aim for ${nextReps} reps at ${targetWeight} kg (range ${rangeMin}–${rangeMax}).` };
};

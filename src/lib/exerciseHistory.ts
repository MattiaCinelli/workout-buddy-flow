import { WorkoutSession, WorkoutSetResult } from '@/data/workoutSessions';

// Mirrors personalRecords.ts: prefer the logged actuals, fall back to the
// planned sets for sessions saved before per-set results existed. Warm-ups
// are not "doing the exercise" for progress-tracking purposes.
const completedSetsOf = (session: WorkoutSession): WorkoutSetResult[] =>
  (session.actualSets ?? session.sets.map((set, setIndex) => ({ ...set, setIndex, completed: true })))
    .filter(set => set.completed && !set.warmup);

export interface ExerciseSessionEntry {
  sessionId: string;
  /** ISO date of the session. */
  date: string;
  workoutTitle: string;
  /** Only the completed sets of the exercise in question. */
  sets: WorkoutSetResult[];
}

// Every past session that has at least one completed set of this exercise,
// newest first, reduced to just that exercise's sets.
export const exerciseSessionHistory = (
  exerciseId: string,
  sessions: WorkoutSession[],
): ExerciseSessionEntry[] =>
  sessions
    .map(session => ({
      sessionId: session.id,
      date: session.date,
      workoutTitle: session.title,
      sets: completedSetsOf(session).filter(set => set.exerciseId === exerciseId),
    }))
    .filter(entry => entry.sets.length > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// The most recent past session containing this exercise — what the guided
// player shows as "last time" so the target is in view before the set.
export const lastExerciseSession = (
  exerciseId: string,
  sessions: WorkoutSession[],
): ExerciseSessionEntry | null =>
  exerciseSessionHistory(exerciseId, sessions)[0] ?? null;

export interface ExerciseSessionSummary {
  sessionId: string;
  date: string;
  workoutTitle: string;
  setCount: number;
  /** Heaviest completed set. */
  topWeight?: number;
  /** Σ weight×reps across sets where both are recorded. */
  totalVolume?: number;
  totalReps?: number;
  bestDuration?: number;
  bestDistance?: number;
}

const summarize = (entry: ExerciseSessionEntry): ExerciseSessionSummary => {
  const summary: ExerciseSessionSummary = {
    sessionId: entry.sessionId, date: entry.date, workoutTitle: entry.workoutTitle, setCount: entry.sets.length,
  };
  for (const set of entry.sets) {
    if (set.weight !== undefined) summary.topWeight = Math.max(summary.topWeight ?? 0, set.weight);
    if (set.reps !== undefined) summary.totalReps = (summary.totalReps ?? 0) + set.reps;
    if (set.weight !== undefined && set.reps !== undefined) {
      summary.totalVolume = (summary.totalVolume ?? 0) + set.weight * set.reps;
    }
    if (set.duration !== undefined) summary.bestDuration = Math.max(summary.bestDuration ?? 0, set.duration);
    if (set.distance !== undefined) summary.bestDistance = Math.max(summary.bestDistance ?? 0, set.distance);
  }
  return summary;
};

// One row per past session, oldest first — ready to feed a trend chart.
export const exerciseSessionSummaries = (
  exerciseId: string,
  sessions: WorkoutSession[],
): ExerciseSessionSummary[] =>
  exerciseSessionHistory(exerciseId, sessions).map(summarize).reverse();

export const formatLoggedDuration = (seconds: number): string =>
  seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`;

export const formatLoggedDistance = (metres: number): string =>
  metres >= 1000 ? `${Number((metres / 1000).toFixed(2))} km` : `${metres} m`;

// "10 × 40 kg", "12 reps", "1:30", "5 km", or combinations joined with " · ".
export const describeSetResult = (
  set: Pick<WorkoutSetResult, 'reps' | 'weight' | 'duration' | 'distance'>,
): string => {
  const parts: string[] = [];
  if (set.reps !== undefined && set.weight !== undefined) parts.push(`${set.reps} × ${set.weight} kg`);
  else if (set.reps !== undefined) parts.push(`${set.reps} reps`);
  else if (set.weight !== undefined) parts.push(`${set.weight} kg`);
  if (set.duration !== undefined) parts.push(formatLoggedDuration(set.duration));
  if (set.distance !== undefined) parts.push(formatLoggedDistance(set.distance));
  return parts.join(' · ') || '—';
};

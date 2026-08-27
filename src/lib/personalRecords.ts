import { WorkoutSession, WorkoutSetResult } from '@/data/workoutSessions';

export interface RecordEntry {
  value: number;
  date: string;
}

// Four independent bests per exercise rather than one estimated 1-rep-max —
// weight, reps, duration, and distance measure genuinely different things
// (a bodyweight exercise has no weight PR; a plank has no rep PR), and an
// estimated-1RM formula would imply false precision this app doesn't have
// the data to back up.
export interface PersonalRecord {
  exerciseId: string;
  maxWeight?: RecordEntry;
  maxReps?: RecordEntry;
  maxDuration?: RecordEntry;
  maxDistance?: RecordEntry;
}

// Working sets only — warm-ups never set a record.
const completedSetsOf = (session: WorkoutSession): WorkoutSetResult[] =>
  (session.actualSets ?? session.sets.map((set, setIndex) => ({ ...set, setIndex, completed: true })))
    .filter(set => set.completed && !set.warmup);

const applySet = (records: Map<string, PersonalRecord>, exerciseId: string, date: string, set: WorkoutSetResult) => {
  const record = records.get(exerciseId) ?? { exerciseId };
  if (set.weight !== undefined && (!record.maxWeight || set.weight > record.maxWeight.value)) {
    record.maxWeight = { value: set.weight, date };
  }
  if (set.reps !== undefined && (!record.maxReps || set.reps > record.maxReps.value)) {
    record.maxReps = { value: set.reps, date };
  }
  if (set.duration !== undefined && (!record.maxDuration || set.duration > record.maxDuration.value)) {
    record.maxDuration = { value: set.duration, date };
  }
  if (set.distance !== undefined && (!record.maxDistance || set.distance > record.maxDistance.value)) {
    record.maxDistance = { value: set.distance, date };
  }
  records.set(exerciseId, record);
};

// Chronological order matters for callers that want to know when a record
// was set — sessions aren't assumed to already be sorted.
export const computePersonalRecords = (sessions: WorkoutSession[]): Map<string, PersonalRecord> => {
  const records = new Map<string, PersonalRecord>();
  const byDateAscending = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const session of byDateAscending) {
    for (const set of completedSetsOf(session)) {
      applySet(records, set.exerciseId, session.date, set);
    }
  }
  return records;
};

export type PRKind = 'weight' | 'reps' | 'duration' | 'distance';

export interface NewPersonalRecord {
  exerciseId: string;
  kind: PRKind;
  value: number;
  previousValue?: number;
}

// Compares a just-finished session's sets against records built from
// everything that came before it — only genuine improvements over an
// EXISTING best are reported, not "first time doing this exercise" (every
// brand-new exercise would otherwise trigger a "PR" on its very first set).
export const detectNewPersonalRecords = (
  finishedSets: WorkoutSetResult[],
  priorSessions: WorkoutSession[]
): NewPersonalRecord[] => {
  const priorRecords = computePersonalRecords(priorSessions);
  const newRecords = new Map<string, NewPersonalRecord>();

  const consider = (exerciseId: string, kind: PRKind, value: number | undefined, previous?: RecordEntry) => {
    if (value === undefined || !previous || value <= previous.value) return;
    const key = `${exerciseId}:${kind}`;
    const existing = newRecords.get(key);
    if (!existing || value > existing.value) newRecords.set(key, { exerciseId, kind, value, previousValue: previous.value });
  };

  for (const set of finishedSets.filter(item => item.completed && !item.warmup)) {
    const prior = priorRecords.get(set.exerciseId);
    consider(set.exerciseId, 'weight', set.weight, prior?.maxWeight);
    consider(set.exerciseId, 'reps', set.reps, prior?.maxReps);
    consider(set.exerciseId, 'duration', set.duration, prior?.maxDuration);
    consider(set.exerciseId, 'distance', set.distance, prior?.maxDistance);
  }

  return [...newRecords.values()];
};

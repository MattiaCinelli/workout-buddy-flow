import { z } from 'zod';

// Deliberately lenient: `.passthrough()` keeps fields we don't know about
// (a backup from a newer app version), and only the load-bearing fields are
// required. The point is to reject records that would crash rendering or
// the guided player, not to enforce a full schema.

const id = z.string().min(1);

export const exerciseImportSchema = z.object({
  id,
  name: z.string(),
  category: z.string(),
  muscleGroups: z.array(z.string()),
  difficulty: z.string(),
}).passthrough();

const setImportSchema = z.object({ exerciseId: z.string() }).passthrough();

export const workoutImportSchema = z.object({
  id,
  date: z.string(),
  title: z.string(),
  duration: z.number(),
  category: z.string(),
  sets: z.array(setImportSchema),
}).passthrough();

export const workoutSessionImportSchema = workoutImportSchema.extend({
  workoutId: z.string(),
  completedAt: z.string(),
  plannedDuration: z.number(),
}).passthrough();

export const scheduledWorkoutImportSchema = z.object({
  id,
  workoutId: z.string(),
  startDate: z.string(),
  startTime: z.string(),
  recurrence: z.string(),
}).passthrough();

export const courseImportSchema = z.object({
  id,
  title: z.string(),
  workouts: z.array(z.object({ id: z.string() }).passthrough()),
  createdAt: z.string(),
}).passthrough();

export const muscleGroupImportSchema = z.object({ id, name: z.string() }).passthrough();

export const bodyMetricImportSchema = z.object({ id, date: z.string(), weight: z.number() }).passthrough();

export type ImportedRecord = { id: string } & Record<string, unknown>;

export interface CollectionValidation {
  records: ImportedRecord[];
  warnings: string[];
}

// Validates a collection from an import file: drops malformed records and
// same-id duplicates, collecting a human note for each kind of problem.
export const validateImportCollection = (
  label: string,
  raw: unknown,
  schema: z.ZodTypeAny,
): CollectionValidation => {
  const list = Array.isArray(raw) ? raw : [];
  const records: ImportedRecord[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let malformed = 0;

  for (const item of list) {
    const result = schema.safeParse(item);
    if (!result.success) { malformed += 1; continue; }
    const record = result.data as ImportedRecord;
    if (seen.has(record.id)) {
      warnings.push(`${label}: skipped a duplicate id (${record.id}).`);
      continue;
    }
    seen.add(record.id);
    records.push(record);
  }

  if (malformed > 0) {
    warnings.push(`${label}: skipped ${malformed} record${malformed === 1 ? '' : 's'} with an unexpected shape.`);
  }
  return { records, warnings };
};

// Notes any exercise ids referenced by workouts/sessions that aren't in the
// imported exercise list (a full restore would show them without a name).
export const checkExerciseReferences = (
  exerciseIds: Iterable<string>,
  containers: Array<{ label: string; sets: Array<{ exerciseId: string }> }>,
): string[] => {
  const known = new Set(exerciseIds);
  const warnings: string[] = [];
  for (const container of containers) {
    const missing = [...new Set(container.sets.map(set => set.exerciseId).filter(ref => !known.has(ref)))];
    if (missing.length > 0) {
      warnings.push(`${container.label}: references ${missing.length} exercise${missing.length === 1 ? '' : 's'} not in the file.`);
    }
  }
  return warnings;
};

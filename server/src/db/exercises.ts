import { Db } from './index';

export interface SyncedExercise {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  difficulty: string;
  logType?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultWeight?: number;
  defaultDistance?: number;
  secondsPerRep?: number;
  unilateral?: boolean;
  executionDirections?: string[];
  instructions?: string;
  imageUrl?: string;
  updatedAt: string;
  deletedAt?: string;
}

interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  muscle_groups: string;
  difficulty: string;
  log_type: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_duration: number | null;
  default_weight: number | null;
  default_distance: number | null;
  seconds_per_rep: number | null;
  unilateral: number;
  execution_directions: string | null;
  instructions: string | null;
  image_url: string | null;
  updated_at: string;
  deleted_at: string | null;
}

const fromRow = (row: ExerciseRow): SyncedExercise => ({
  id: row.id,
  name: row.name,
  category: row.category,
  muscleGroups: JSON.parse(row.muscle_groups),
  difficulty: row.difficulty,
  logType: row.log_type ?? undefined,
  defaultSets: row.default_sets ?? undefined,
  defaultReps: row.default_reps ?? undefined,
  defaultDuration: row.default_duration ?? undefined,
  defaultWeight: row.default_weight ?? undefined,
  defaultDistance: row.default_distance ?? undefined,
  secondsPerRep: row.seconds_per_rep ?? undefined,
  unilateral: row.unilateral === 1,
  executionDirections: row.execution_directions ? JSON.parse(row.execution_directions) : undefined,
  instructions: row.instructions ?? undefined,
  imageUrl: row.image_url ?? undefined,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

// Rows for this user changed after `since` (all of them if `since` is
// omitted, for a device's first sync). Includes soft-deleted rows so the
// caller can remove them locally too.
//
// Filters by synced_at (when the SERVER stored the row), not updated_at
// (when the CLIENT made the edit) — these are different clocks. A record
// edited at T1 but not pushed until T3 must still show up for a device
// whose watermark is T2 (T1 < T2 < T3): its edit predates that watermark,
// but it only actually arrived on the server after it. Filtering by
// updated_at would silently and permanently hide it from that device.
export const listChangedSince = (db: Db, userId: string, since?: string): SyncedExercise[] => {
  const rows = since
    ? db.prepare('SELECT * FROM exercises WHERE user_id = ? AND synced_at > ? ORDER BY synced_at')
        .all(userId, since) as ExerciseRow[]
    : db.prepare('SELECT * FROM exercises WHERE user_id = ? ORDER BY synced_at').all(userId) as ExerciseRow[];
  return rows.map(fromRow);
};

// Last-write-wins upsert: the incoming row only overwrites the stored one
// if its updatedAt is strictly newer. Conflicts are scoped to (id, userId),
// so this can never touch another user's row even on an id collision.
// Always returns the row that ended up stored — the caller reconciles by
// comparing it to what it sent, rather than trusting its own write blindly.
export const upsertExercise = (db: Db, userId: string, exercise: SyncedExercise): SyncedExercise => {
  const syncedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO exercises (
      id, user_id, name, category, muscle_groups, difficulty,
      log_type, default_sets, default_reps, default_duration, default_weight, default_distance, seconds_per_rep, unilateral, execution_directions,
      instructions, image_url, updated_at, deleted_at, synced_at
    )
    VALUES (
      @id, @userId, @name, @category, @muscleGroups, @difficulty,
      @logType, @defaultSets, @defaultReps, @defaultDuration, @defaultWeight, @defaultDistance, @secondsPerRep, @unilateral, @executionDirections,
      @instructions, @imageUrl, @updatedAt, @deletedAt, @syncedAt
    )
    ON CONFLICT(id, user_id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      muscle_groups = excluded.muscle_groups,
      difficulty = excluded.difficulty,
      log_type = excluded.log_type,
      default_sets = excluded.default_sets,
      default_reps = excluded.default_reps,
      default_duration = excluded.default_duration,
      default_weight = excluded.default_weight,
      default_distance = excluded.default_distance,
      seconds_per_rep = excluded.seconds_per_rep,
      unilateral = excluded.unilateral,
      execution_directions = excluded.execution_directions,
      instructions = excluded.instructions,
      image_url = excluded.image_url,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      synced_at = excluded.synced_at
    WHERE excluded.updated_at > exercises.updated_at
  `).run({
    id: exercise.id,
    userId,
    name: exercise.name,
    category: exercise.category,
    muscleGroups: JSON.stringify(exercise.muscleGroups),
    difficulty: exercise.difficulty,
    logType: exercise.logType ?? null,
    defaultSets: exercise.defaultSets ?? null,
    defaultReps: exercise.defaultReps ?? null,
    defaultDuration: exercise.defaultDuration ?? null,
    defaultWeight: exercise.defaultWeight ?? null,
    defaultDistance: exercise.defaultDistance ?? null,
    secondsPerRep: exercise.secondsPerRep ?? null,
    unilateral: exercise.unilateral ? 1 : 0,
    executionDirections: exercise.executionDirections?.length ? JSON.stringify(exercise.executionDirections) : null,
    instructions: exercise.instructions ?? null,
    imageUrl: exercise.imageUrl ?? null,
    updatedAt: exercise.updatedAt,
    deletedAt: exercise.deletedAt ?? null,
    syncedAt,
  });

  const row = db.prepare('SELECT * FROM exercises WHERE id = ? AND user_id = ?')
    .get(exercise.id, userId) as ExerciseRow;
  return fromRow(row);
};

// Applies a client's whole push in one transaction, so a batch either
// commits atomically or not at all — no partial push left stored if
// something in the middle of it fails. Returns the winning state for each
// input row, in the same order, mirroring upsertExercise's per-row contract.
export const upsertExercisesBatch = (db: Db, userId: string, exercises: SyncedExercise[]): SyncedExercise[] => {
  const applyAll = db.transaction((items: SyncedExercise[]) =>
    items.map(item => upsertExercise(db, userId, item))
  );
  return applyAll(exercises);
};

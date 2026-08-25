import { Db } from './index';

export interface SyncedWorkoutSet {
  exerciseId: string;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  restAfter?: number;
}

export interface SyncedWorkout {
  id: string;
  date: string;
  title: string;
  duration: number;
  category: string;
  sets: SyncedWorkoutSet[];
  restBetweenExercises?: number;
  notes?: string;
  updatedAt: string;
  deletedAt?: string;
}

interface WorkoutRow {
  id: string;
  date: string;
  title: string;
  duration: number;
  category: string;
  sets: string;
  rest_between_exercises: number | null;
  notes: string | null;
  updated_at: string;
  deleted_at: string | null;
}

const fromRow = (row: WorkoutRow): SyncedWorkout => ({
  id: row.id,
  date: row.date,
  title: row.title,
  duration: row.duration,
  category: row.category,
  sets: JSON.parse(row.sets),
  restBetweenExercises: row.rest_between_exercises ?? undefined,
  notes: row.notes ?? undefined,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

// Filters by synced_at (server write time), not updated_at (client edit
// time) — see the comment in exercises.ts's listChangedSince for why these
// are different clocks and using the wrong one silently drops records.
export const listChangedSince = (db: Db, userId: string, since?: string): SyncedWorkout[] => {
  const rows = since
    ? db.prepare('SELECT * FROM workouts WHERE user_id = ? AND synced_at > ? ORDER BY synced_at')
        .all(userId, since) as WorkoutRow[]
    : db.prepare('SELECT * FROM workouts WHERE user_id = ? ORDER BY synced_at').all(userId) as WorkoutRow[];
  return rows.map(fromRow);
};

export const upsertWorkout = (db: Db, userId: string, workout: SyncedWorkout): SyncedWorkout => {
  const syncedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO workouts (id, user_id, date, title, duration, category, sets, rest_between_exercises, notes, updated_at, deleted_at, synced_at)
    VALUES (@id, @userId, @date, @title, @duration, @category, @sets, @restBetweenExercises, @notes, @updatedAt, @deletedAt, @syncedAt)
    ON CONFLICT(id, user_id) DO UPDATE SET
      date = excluded.date,
      title = excluded.title,
      duration = excluded.duration,
      category = excluded.category,
      sets = excluded.sets,
      rest_between_exercises = excluded.rest_between_exercises,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      synced_at = excluded.synced_at
    WHERE excluded.updated_at > workouts.updated_at
  `).run({
    id: workout.id,
    userId,
    date: workout.date,
    title: workout.title,
    duration: workout.duration,
    category: workout.category,
    sets: JSON.stringify(workout.sets),
    restBetweenExercises: workout.restBetweenExercises ?? null,
    notes: workout.notes ?? null,
    updatedAt: workout.updatedAt,
    deletedAt: workout.deletedAt ?? null,
    syncedAt,
  });

  const row = db.prepare('SELECT * FROM workouts WHERE id = ? AND user_id = ?')
    .get(workout.id, userId) as WorkoutRow;
  return fromRow(row);
};

export const upsertWorkoutsBatch = (db: Db, userId: string, workouts: SyncedWorkout[]): SyncedWorkout[] => {
  const applyAll = db.transaction((items: SyncedWorkout[]) => items.map(item => upsertWorkout(db, userId, item)));
  return applyAll(workouts);
};

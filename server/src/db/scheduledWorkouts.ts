import { Db } from './index';

export interface SyncedScheduledWorkout {
  id: string;
  workoutId: string;
  startDate: string;
  startTime: string;
  endTime?: string;
  recurrence: string;
  recurrenceDay?: string;
  endRecurrenceDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface ScheduledWorkoutRow {
  id: string;
  workout_id: string;
  start_date: string;
  start_time: string;
  end_time: string | null;
  recurrence: string;
  recurrence_day: string | null;
  end_recurrence_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const fromRow = (row: ScheduledWorkoutRow): SyncedScheduledWorkout => ({
  id: row.id,
  workoutId: row.workout_id,
  startDate: row.start_date,
  startTime: row.start_time,
  endTime: row.end_time ?? undefined,
  recurrence: row.recurrence,
  recurrenceDay: row.recurrence_day ?? undefined,
  endRecurrenceDate: row.end_recurrence_date ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

// Filters by synced_at (server write time), not updated_at (client edit
// time) — see the comment in exercises.ts's listChangedSince for why these
// are different clocks and using the wrong one silently drops records.
export const listChangedSince = (db: Db, userId: string, since?: string): SyncedScheduledWorkout[] => {
  const rows = since
    ? db.prepare('SELECT * FROM scheduled_workouts WHERE user_id = ? AND synced_at > ? ORDER BY synced_at')
        .all(userId, since) as ScheduledWorkoutRow[]
    : db.prepare('SELECT * FROM scheduled_workouts WHERE user_id = ? ORDER BY synced_at').all(userId) as ScheduledWorkoutRow[];
  return rows.map(fromRow);
};

export const upsertScheduledWorkout = (db: Db, userId: string, item: SyncedScheduledWorkout): SyncedScheduledWorkout => {
  const syncedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO scheduled_workouts (
      id, user_id, workout_id, start_date, start_time, end_time, recurrence,
      recurrence_day, end_recurrence_date, notes, created_at, updated_at, deleted_at, synced_at
    )
    VALUES (
      @id, @userId, @workoutId, @startDate, @startTime, @endTime, @recurrence,
      @recurrenceDay, @endRecurrenceDate, @notes, @createdAt, @updatedAt, @deletedAt, @syncedAt
    )
    ON CONFLICT(id, user_id) DO UPDATE SET
      workout_id = excluded.workout_id,
      start_date = excluded.start_date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      recurrence = excluded.recurrence,
      recurrence_day = excluded.recurrence_day,
      end_recurrence_date = excluded.end_recurrence_date,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      synced_at = excluded.synced_at
    WHERE excluded.updated_at > scheduled_workouts.updated_at
  `).run({
    id: item.id,
    userId,
    workoutId: item.workoutId,
    startDate: item.startDate,
    startTime: item.startTime,
    endTime: item.endTime ?? null,
    recurrence: item.recurrence,
    recurrenceDay: item.recurrenceDay ?? null,
    endRecurrenceDate: item.endRecurrenceDate ?? null,
    notes: item.notes ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt ?? null,
    syncedAt,
  });

  const row = db.prepare('SELECT * FROM scheduled_workouts WHERE id = ? AND user_id = ?')
    .get(item.id, userId) as ScheduledWorkoutRow;
  return fromRow(row);
};

export const upsertScheduledWorkoutsBatch = (
  db: Db,
  userId: string,
  items: SyncedScheduledWorkout[]
): SyncedScheduledWorkout[] => {
  const applyAll = db.transaction((batch: SyncedScheduledWorkout[]) =>
    batch.map(item => upsertScheduledWorkout(db, userId, item))
  );
  return applyAll(items);
};

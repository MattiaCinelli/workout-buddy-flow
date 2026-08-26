import { Db } from './index';

export interface SyncedMuscleGroup {
  id: string;
  name: string;
  updatedAt: string;
  deletedAt?: string;
}

interface MuscleGroupRow {
  id: string;
  name: string;
  updated_at: string;
  deleted_at: string | null;
}

const fromRow = (row: MuscleGroupRow): SyncedMuscleGroup => ({
  id: row.id,
  name: row.name,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

// Filters by synced_at (server write time), not updated_at (client edit
// time) — see the comment in exercises.ts's listChangedSince for why these
// are different clocks and using the wrong one silently drops records.
export const listChangedSince = (db: Db, userId: string, since?: string): SyncedMuscleGroup[] => {
  const rows = since
    ? db.prepare('SELECT * FROM muscle_groups WHERE user_id = ? AND synced_at > ? ORDER BY synced_at')
        .all(userId, since) as MuscleGroupRow[]
    : db.prepare('SELECT * FROM muscle_groups WHERE user_id = ? ORDER BY synced_at').all(userId) as MuscleGroupRow[];
  return rows.map(fromRow);
};

export const upsertMuscleGroup = (db: Db, userId: string, item: SyncedMuscleGroup): SyncedMuscleGroup => {
  const syncedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO muscle_groups (id, user_id, name, updated_at, deleted_at, synced_at)
    VALUES (@id, @userId, @name, @updatedAt, @deletedAt, @syncedAt)
    ON CONFLICT(id, user_id) DO UPDATE SET
      name = excluded.name,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      synced_at = excluded.synced_at
    WHERE excluded.updated_at > muscle_groups.updated_at
  `).run({
    id: item.id,
    userId,
    name: item.name,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt ?? null,
    syncedAt,
  });

  const row = db.prepare('SELECT * FROM muscle_groups WHERE id = ? AND user_id = ?')
    .get(item.id, userId) as MuscleGroupRow;
  return fromRow(row);
};

export const upsertMuscleGroupsBatch = (db: Db, userId: string, items: SyncedMuscleGroup[]): SyncedMuscleGroup[] => {
  const applyAll = db.transaction((batch: SyncedMuscleGroup[]) =>
    batch.map(item => upsertMuscleGroup(db, userId, item))
  );
  return applyAll(items);
};

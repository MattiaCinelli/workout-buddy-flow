import { Db } from './index';

export interface SyncedBodyMetric {
  id: string;
  date: string;
  weight: number;
  notes?: string;
  updatedAt: string;
  deletedAt?: string;
}

interface BodyMetricRow {
  id: string;
  date: string;
  weight: number;
  notes: string | null;
  updated_at: string;
  deleted_at: string | null;
}

const fromRow = (row: BodyMetricRow): SyncedBodyMetric => ({
  id: row.id,
  date: row.date,
  weight: row.weight,
  notes: row.notes ?? undefined,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

// Filters by synced_at (server write time), not updated_at (client edit
// time) — see the comment in exercises.ts's listChangedSince for why these
// are different clocks and using the wrong one silently drops records.
export const listChangedSince = (db: Db, userId: string, since?: string): SyncedBodyMetric[] => {
  const rows = since
    ? db.prepare('SELECT * FROM body_metrics WHERE user_id = ? AND synced_at > ? ORDER BY synced_at')
        .all(userId, since) as BodyMetricRow[]
    : db.prepare('SELECT * FROM body_metrics WHERE user_id = ? ORDER BY synced_at').all(userId) as BodyMetricRow[];
  return rows.map(fromRow);
};

export const upsertBodyMetric = (db: Db, userId: string, item: SyncedBodyMetric): SyncedBodyMetric => {
  const syncedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO body_metrics (id, user_id, date, weight, notes, updated_at, deleted_at, synced_at)
    VALUES (@id, @userId, @date, @weight, @notes, @updatedAt, @deletedAt, @syncedAt)
    ON CONFLICT(id, user_id) DO UPDATE SET
      date = excluded.date,
      weight = excluded.weight,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      synced_at = excluded.synced_at
    WHERE excluded.updated_at > body_metrics.updated_at
  `).run({
    id: item.id,
    userId,
    date: item.date,
    weight: item.weight,
    notes: item.notes ?? null,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt ?? null,
    syncedAt,
  });

  const row = db.prepare('SELECT * FROM body_metrics WHERE id = ? AND user_id = ?')
    .get(item.id, userId) as BodyMetricRow;
  return fromRow(row);
};

export const upsertBodyMetricsBatch = (db: Db, userId: string, items: SyncedBodyMetric[]): SyncedBodyMetric[] => {
  const applyAll = db.transaction((batch: SyncedBodyMetric[]) =>
    batch.map(item => upsertBodyMetric(db, userId, item))
  );
  return applyAll(items);
};

import { Db } from './index';

export interface SyncedMeasurement {
  id: string;
  measurementId: string;
  name: string;
  description?: string;
  kind: 'length' | 'weight' | 'time';
  better: 'higher' | 'lower';
  value: number;
  date: string;
  notes?: string;
  updatedAt: string;
  deletedAt?: string;
}

interface MeasurementRow {
  id: string;
  measurement_id: string;
  name: string;
  description: string | null;
  kind: SyncedMeasurement['kind'];
  better: SyncedMeasurement['better'];
  value: number;
  date: string;
  notes: string | null;
  updated_at: string;
  deleted_at: string | null;
}

const fromRow = (row: MeasurementRow): SyncedMeasurement => ({
  id: row.id,
  measurementId: row.measurement_id,
  name: row.name,
  description: row.description ?? undefined,
  kind: row.kind,
  better: row.better,
  value: row.value,
  date: row.date,
  notes: row.notes ?? undefined,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? undefined,
});

// Filters by synced_at (server write time), not updated_at (client edit
// time) — see the comment in exercises.ts's listChangedSince.
export const listChangedSince = (db: Db, userId: string, since?: string): SyncedMeasurement[] => {
  const rows = since
    ? db.prepare('SELECT * FROM measurements WHERE user_id = ? AND synced_at > ? ORDER BY synced_at')
        .all(userId, since) as MeasurementRow[]
    : db.prepare('SELECT * FROM measurements WHERE user_id = ? ORDER BY synced_at').all(userId) as MeasurementRow[];
  return rows.map(fromRow);
};

export const upsertMeasurement = (db: Db, userId: string, item: SyncedMeasurement): SyncedMeasurement => {
  const syncedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO measurements (
      id, user_id, measurement_id, name, description, kind, better, value, date, notes, updated_at, deleted_at, synced_at
    )
    VALUES (
      @id, @userId, @measurementId, @name, @description, @kind, @better, @value, @date, @notes, @updatedAt, @deletedAt, @syncedAt
    )
    ON CONFLICT(id, user_id) DO UPDATE SET
      measurement_id = excluded.measurement_id,
      name = excluded.name,
      description = excluded.description,
      kind = excluded.kind,
      better = excluded.better,
      value = excluded.value,
      date = excluded.date,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      synced_at = excluded.synced_at
    WHERE excluded.updated_at > measurements.updated_at
  `).run({
    id: item.id,
    userId,
    measurementId: item.measurementId,
    name: item.name,
    description: item.description ?? null,
    kind: item.kind,
    better: item.better,
    value: item.value,
    date: item.date,
    notes: item.notes ?? null,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt ?? null,
    syncedAt,
  });

  const row = db.prepare('SELECT * FROM measurements WHERE id = ? AND user_id = ?')
    .get(item.id, userId) as MeasurementRow;
  return fromRow(row);
};

export const upsertMeasurementsBatch = (db: Db, userId: string, items: SyncedMeasurement[]): SyncedMeasurement[] => {
  const applyAll = db.transaction((batch: SyncedMeasurement[]) =>
    batch.map(item => upsertMeasurement(db, userId, item))
  );
  return applyAll(items);
};

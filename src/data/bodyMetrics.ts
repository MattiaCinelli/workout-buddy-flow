export interface BodyMetric {
  id: string;
  date: string; // ISO date (YYYY-MM-DD) — one entry per day is the norm
  weight: number; // kg
  notes?: string;
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // sync tombstone — set by useIndexedDBCollection on delete while a sync server is connected; offline deletes hard-remove the row instead
}

export const defaultBodyMetrics: BodyMetric[] = [];

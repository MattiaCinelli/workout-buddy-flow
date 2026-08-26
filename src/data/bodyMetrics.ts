export interface BodyMetric {
  id: string;
  date: string; // ISO date (YYYY-MM-DD) — one entry per day is the norm
  weight: number; // kg
  notes?: string;
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // reserved for self-hosted sync; local deletes don't set this yet
}

export const defaultBodyMetrics: BodyMetric[] = [];

// Shared soft-delete helpers for the IndexedDB collections.
//
// A hard `db.delete` is invisible to sync: the next full pull from the
// server re-creates the row (the server never heard about the deletion),
// and a delete on one device never reaches the others. When a sync server
// is connected, deletions are written as tombstones instead — the record
// stays in the store with a `deletedAt` stamp, is filtered out of every
// in-memory view, and rides the normal push/pull like any other change.

export interface Deletable {
  id: string;
  updatedAt?: string;
  deletedAt?: string;
}

// Unconstrained so it can filter the generic collection hook's `T` (which
// only guarantees an `id`); the tombstone stamp is read defensively.
export const isLiveRecord = <T>(record: T): boolean =>
  !(record as { deletedAt?: unknown }).deletedAt;

export const toTombstone = <T extends Deletable>(
  record: T,
  now = new Date().toISOString(),
): T & { deletedAt: string; updatedAt: string } =>
  ({ ...record, deletedAt: now, updatedAt: now });

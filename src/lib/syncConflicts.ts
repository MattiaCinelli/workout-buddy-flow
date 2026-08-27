// Sync is last-write-wins by `updatedAt`. That silently discards the losing
// edit. This module makes those losses visible and recoverable: after each
// push the server returns the authoritative record, and if a record we had
// edited locally came back as something else, we keep a copy of our version
// so the user can re-apply it from the Sync settings.

export interface SyncConflict {
  collection: string;
  id: string;
  /** Human label pulled from the record (title / name / date). */
  label: string;
  mineUpdatedAt: string;
  theirsUpdatedAt: string;
  /** The winning version was a deletion. */
  theirsDeleted: boolean;
  detectedAt: string;
  /** The full local record, so "keep mine" can re-write it verbatim. */
  mine: Record<string, unknown>;
}

const CONFLICTS_KEY = 'workout-buddy-sync:conflicts';
const MAX_CONFLICTS = 100;
const baselineKey = (collection: string) => `workout-buddy-sync:base:${collection}`;

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / disabled — conflict tracking is best-effort */
  }
};

// --- baseline: the updatedAt of every record as of the last successful sync

export const getBaseline = (collection: string): Record<string, string> =>
  readJson(baselineKey(collection), {});

export const setBaseline = (collection: string, map: Record<string, string>): void =>
  writeJson(baselineKey(collection), map);

export const clearBaselines = (collections: readonly string[]): void => {
  for (const collection of collections) {
    try { localStorage.removeItem(baselineKey(collection)); } catch { /* ignore */ }
  }
};

// --- conflict list

export const getConflicts = (): SyncConflict[] => readJson<SyncConflict[]>(CONFLICTS_KEY, []);

export const addConflicts = (found: SyncConflict[]): void => {
  if (found.length === 0) return;
  const byKey = new Map(getConflicts().map(item => [`${item.collection}:${item.id}`, item]));
  for (const item of found) byKey.set(`${item.collection}:${item.id}`, item);
  writeJson(CONFLICTS_KEY, [...byKey.values()].slice(-MAX_CONFLICTS));
};

export const removeConflict = (collection: string, id: string): void =>
  writeJson(CONFLICTS_KEY, getConflicts().filter(item => !(item.collection === collection && item.id === id)));

export const clearConflicts = (): void => writeJson(CONFLICTS_KEY, []);

// --- detection

const labelFor = (record: Record<string, unknown>): string => {
  for (const field of ['title', 'name', 'date'] as const) {
    const value = record[field];
    if (typeof value === 'string' && value) return value;
  }
  return '';
};

// Which of the records we just pushed came back from the server as a
// different version than the one we sent — i.e. our local edit lost. Only
// records that actually changed locally since the last sync count (a record
// we never touched can't have a "losing" edit), and a record the server
// has never seen before is new, not conflicted.
export const detectOverwrites = (
  collection: string,
  baseline: Record<string, string>,
  pushedLocal: ReadonlyArray<{ id: string; updatedAt?: string }>,
  serverReturned: ReadonlyArray<{ id: string; updatedAt?: string; deletedAt?: string }>,
  now: string = new Date().toISOString(),
): SyncConflict[] => {
  const serverById = new Map(serverReturned.map(record => [record.id, record]));
  const conflicts: SyncConflict[] = [];

  for (const local of pushedLocal) {
    const base = baseline[local.id];
    if (base === undefined || base === local.updatedAt) continue; // unseen, or unchanged locally
    const server = serverById.get(local.id);
    if (!server || server.updatedAt === local.updatedAt) continue; // our push won (or no echo)

    const record = local as Record<string, unknown>;
    conflicts.push({
      collection,
      id: local.id,
      label: labelFor(record),
      mineUpdatedAt: local.updatedAt ?? '',
      theirsUpdatedAt: server.updatedAt ?? '',
      theirsDeleted: !!server.deletedAt,
      detectedAt: now,
      mine: record,
    });
  }

  return conflicts;
};

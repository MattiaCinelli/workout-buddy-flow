import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course } from '@/data/courses';
import { WorkoutSession } from '@/data/workoutSessions';
import { MuscleGroup } from '@/data/muscleGroups';
import { BodyMetric } from '@/data/bodyMetrics';
import { SEED_IDS } from './seedVersion';
import { addConflicts, clearBaselines, clearConflicts, detectOverwrites, getBaseline, setBaseline } from './syncConflicts';
import {
  getAllExercisesFromDB, saveExerciseToDB, deleteExerciseFromDB,
  getAllWorkoutsFromDB, saveWorkoutToDB, deleteWorkoutFromDB,
  getAllScheduledWorkoutsFromDB, saveScheduledWorkoutToDB, deleteScheduledWorkoutFromDB,
  getAllCoursesFromDB, saveCourseToDB, deleteCourseFromDB,
  getAllWorkoutSessionsFromDB, saveWorkoutSessionToDB, deleteWorkoutSessionFromDB,
  getAllMuscleGroupsFromDB, saveMuscleGroupToDB, deleteMuscleGroupFromDB,
  getAllBodyMetricsFromDB, saveBodyMetricToDB, deleteBodyMetricFromDB,
} from './db';

// Talks to the optional self-hosted sync server (server/). See
// docs/self-hosted-sync.md. Everything here is a no-op path if the user
// never configures a server — nothing in this file runs unless login() has
// been called successfully.

const STORAGE_PREFIX = 'workout-buddy-sync';
const serverUrlKey = `${STORAGE_PREFIX}:serverUrl`;
const tokenKey = `${STORAGE_PREFIX}:token`;
const emailKey = `${STORAGE_PREFIX}:email`;
const displayNameKey = `${STORAGE_PREFIX}:displayName`;
const watermarkKey = (collection: string) => `${STORAGE_PREFIX}:watermark:${collection}`;
const lastSyncedAtKey = `${STORAGE_PREFIX}:lastSyncedAt`;
const lastErrorKey = `${STORAGE_PREFIX}:lastError`;
const lastErrorAtKey = `${STORAGE_PREFIX}:lastErrorAt`;

export const getServerUrl = (): string | null => localStorage.getItem(serverUrlKey);
export const getLoggedInEmail = (): string | null => localStorage.getItem(emailKey);
// Falls back to the email in the UI when unset — this is purely cosmetic,
// there's always an email underneath as the actual login identifier.
export const getDisplayName = (): string | null => localStorage.getItem(displayNameKey);
export const isConnected = (): boolean => !!(localStorage.getItem(serverUrlKey) && localStorage.getItem(tokenKey));
// Persisted (not just component state) so a background sync — which runs
// independent of whatever page/dialog happens to be mounted — still shows
// up next time the sync UI is opened, rather than only reflecting whichever
// sync last happened to run while that UI was on screen.
export const getLastSyncedAt = (): string | null => localStorage.getItem(lastSyncedAtKey);

export interface SyncStatus {
  lastOkAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}
export const getSyncStatus = (): SyncStatus => ({
  lastOkAt: localStorage.getItem(lastSyncedAtKey),
  lastError: localStorage.getItem(lastErrorKey),
  lastErrorAt: localStorage.getItem(lastErrorAtKey),
});

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '');

const errorMessageFrom = async (response: Response): Promise<string> => {
  const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  return body?.error || body?.message || `Request failed (${response.status})`;
};

export const login = async (serverUrl: string, email: string, password: string): Promise<void> => {
  const url = normalizeUrl(serverUrl);
  const response = await fetch(`${url}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await errorMessageFrom(response));

  const { token, displayName } = await response.json() as { token: string; displayName?: string };
  localStorage.setItem(serverUrlKey, url);
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(emailKey, email);
  if (displayName) localStorage.setItem(displayNameKey, displayName);
  else localStorage.removeItem(displayNameKey);
};

const COLLECTION_PATHS = ['exercises', 'workouts', 'scheduledWorkouts', 'courses', 'workoutSessions', 'muscleGroups', 'bodyMetrics'];

export const logout = async (): Promise<void> => {
  const url = localStorage.getItem(serverUrlKey);
  const token = localStorage.getItem(tokenKey);
  if (url && token) {
    // Best-effort: revoke the session server-side, but local state is
    // cleared either way — a network failure here shouldn't trap the user
    // in a "logged in" UI they can no longer do anything with.
    try {
      await fetch(`${url}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.warn('Could not reach the server to revoke the session (clearing local state anyway):', error);
    }
  }
  localStorage.removeItem(serverUrlKey);
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(emailKey);
  localStorage.removeItem(displayNameKey);
  localStorage.removeItem(lastSyncedAtKey);
  localStorage.removeItem(lastErrorKey);
  localStorage.removeItem(lastErrorAtKey);
  COLLECTION_PATHS.forEach(path => localStorage.removeItem(watermarkKey(path)));
  clearBaselines(COLLECTION_PATHS);
  clearConflicts();
};

interface SyncedRecord {
  id: string;
  updatedAt?: string;
  deletedAt?: string;
}

const authorizedRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const url = localStorage.getItem(serverUrlKey);
  const token = localStorage.getItem(tokenKey);
  if (!url || !token) throw new Error('Not connected to a sync server. Log in first.');

  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  if (!response.ok) throw new Error(await errorMessageFrom(response));
  // A 204 (e.g. /account/password) has no body — response.json() throws
  // ("Unexpected end of JSON input") on an empty body rather than
  // returning something falsy, so this has to be checked explicitly.
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

const pull = async <T extends SyncedRecord>(collection: string, since?: string) => {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  const body = await authorizedRequest<Record<string, unknown>>(`/sync/${collection}${query}`, { method: 'GET' });
  return { items: (body[collection] ?? []) as T[], serverTime: body.serverTime as string };
};

const push = async <T extends SyncedRecord>(collection: string, items: T[]): Promise<T[]> => {
  if (items.length === 0) return [];
  const body = await authorizedRequest<Record<string, unknown>>(`/sync/${collection}`, {
    method: 'POST',
    body: JSON.stringify({ [collection]: items }),
  });
  return (body[collection] ?? []) as T[];
};

export interface CollectionSyncResult {
  collection: string;
  pushed: number;
  pulled: number;
}

// 'both' is the normal bidirectional merge. The one-way modes are manual,
// deliberate overrides for when the automatic last-write-wins merge would
// do the wrong thing:
//   'push' — this device is authoritative. Every local record's updatedAt
//            is bumped to now so it deterministically wins on the server,
//            and nothing is pulled back. For "the server has stale/junk
//            data, mine is correct".
//   'pull' — the server is authoritative. Nothing local is pushed; server
//            versions overwrite local ones. Pair with resetSyncState() to
//            re-pull the whole account. For "this device is out of step,
//            just give me what the server has". Records that only exist on
//            this device (never pushed) are left untouched.
export type SyncDirection = 'both' | 'push' | 'pull';

interface CollectionSyncConfig<T extends SyncedRecord> {
  path: string;
  getAll: () => Promise<T[]>;
  save: (item: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const syncCollection = async <T extends SyncedRecord>(
  config: CollectionSyncConfig<T>,
  direction: SyncDirection = 'both',
): Promise<CollectionSyncResult> => {
  const { path, getAll, save, remove } = config;

  // Records created before sync was configured (or before this field
  // existed at all) may not have updatedAt yet. Backfill and persist it
  // rather than silently excluding them from every future sync.
  let localItems = await Promise.all((await getAll()).map(async item => {
    if (item.updatedAt) return item;
    const stamped = { ...item, updatedAt: new Date().toISOString() };
    await save(stamped);
    return stamped;
  }));

  let pushed: T[] = [];
  if (direction !== 'pull') {
    // Push-only: declare this device authoritative by stamping every
    // record with the same fresh updatedAt, so each one wins the server's
    // last-write-wins comparison regardless of what's there now.
    if (direction === 'push') {
      const now = new Date().toISOString();
      localItems = await Promise.all(localItems.map(async item => {
        const stamped = { ...item, updatedAt: now };
        await save(stamped);
        return stamped;
      }));
    }

    // Push: cheap at personal-library scale to push everything rather than
    // track a per-record dirty flag, and the server's upsert is
    // idempotent, so re-pushing unchanged rows is harmless. The response
    // is the authoritative post-conflict state — save it back locally in
    // case this device's own write lost a conflict to another device's
    // newer one.
    pushed = await push(path, localItems);
    // Conflict detection only applies to the automatic merge. In push-only
    // mode the overwrite is intentional, so there's no "lost edit" to
    // surface.
    if (direction === 'both') {
      try {
        addConflicts(detectOverwrites(path, getBaseline(path), localItems, pushed));
      } catch (error) {
        console.warn(`Conflict detection for ${path} failed (sync itself is unaffected):`, error);
      }
    }
    await Promise.all(pushed.map(item => save(item)));
  }

  let pulled: T[] = [];
  if (direction !== 'push') {
    // Pull anything changed on the server since our last watermark
    // (everything, on a first sync or after resetSyncState) and merge it
    // in. In pull-only mode these server versions overwrite local ones.
    const watermark = localStorage.getItem(watermarkKey(path)) ?? undefined;
    const { items, serverTime } = await pull<T>(path, watermark);
    pulled = items;
    await Promise.all(pulled.map(item => save(item)));
    localStorage.setItem(watermarkKey(path), serverTime);
  }

  // Compact: a local tombstone whose deletion the server has now accepted
  // (push succeeded above) has done its job — other devices learn of the
  // delete from their own pulls, and the server keeps the authoritative
  // tombstone. Dropping the local row stops them accumulating forever.
  // Seed-item tombstones are kept: they are what stops a later seed
  // migration re-adding something the user deleted. Skipped in pull-only
  // mode, where nothing was pushed to confirm the server has the delete.
  if (direction !== 'pull') {
    const afterPush = await getAll();
    const tombstones = afterPush.filter(item => item.deletedAt && !SEED_IDS.has(item.id));
    await Promise.all(tombstones.map(item => remove(item.id)));
  }

  // Snapshot the post-merge state so the next sync can tell which records
  // this device changed in the meantime (see detectOverwrites). Done for
  // every direction so a one-way override doesn't leave a stale baseline
  // that makes the next automatic sync report phantom conflicts.
  const finalItems = await getAll();
  setBaseline(path, Object.fromEntries(
    finalItems.filter(item => item.updatedAt).map(item => [item.id, item.updatedAt as string]),
  ));

  return { collection: path, pushed: pushed.length, pulled: pulled.length };
};

// Runs every collection in turn. Deliberately sequential and fail-fast: if
// one collection's sync fails partway through, the caller sees the error
// and can retry, rather than this silently reporting partial success. The
// failure is also recorded so the UI can surface it after a background run.
export const syncAll = async (direction: SyncDirection = 'both'): Promise<CollectionSyncResult[]> => {
  try {
    const results = [
      await syncCollection<Exercise>({ path: 'exercises', getAll: getAllExercisesFromDB, save: saveExerciseToDB, remove: deleteExerciseFromDB }, direction),
      await syncCollection<WorkoutEntry>({ path: 'workouts', getAll: getAllWorkoutsFromDB, save: saveWorkoutToDB, remove: deleteWorkoutFromDB }, direction),
      await syncCollection<ScheduledWorkout>({ path: 'scheduledWorkouts', getAll: getAllScheduledWorkoutsFromDB, save: saveScheduledWorkoutToDB, remove: deleteScheduledWorkoutFromDB }, direction),
      await syncCollection<Course>({ path: 'courses', getAll: getAllCoursesFromDB, save: saveCourseToDB, remove: deleteCourseFromDB }, direction),
      await syncCollection<WorkoutSession>({ path: 'workoutSessions', getAll: getAllWorkoutSessionsFromDB, save: saveWorkoutSessionToDB, remove: deleteWorkoutSessionFromDB }, direction),
      await syncCollection<MuscleGroup>({ path: 'muscleGroups', getAll: getAllMuscleGroupsFromDB, save: saveMuscleGroupToDB, remove: deleteMuscleGroupFromDB }, direction),
      await syncCollection<BodyMetric>({ path: 'bodyMetrics', getAll: getAllBodyMetricsFromDB, save: saveBodyMetricToDB, remove: deleteBodyMetricFromDB }, direction),
    ];
    localStorage.setItem(lastSyncedAtKey, new Date().toISOString());
    localStorage.removeItem(lastErrorKey);
    localStorage.removeItem(lastErrorAtKey);
    return results;
  } catch (error) {
    localStorage.setItem(lastErrorKey, error instanceof Error ? error.message : 'Sync failed');
    localStorage.setItem(lastErrorAtKey, new Date().toISOString());
    throw error;
  }
};

// Forget every pull watermark and conflict baseline so the next sync
// re-pulls the whole account and re-establishes the baselines from scratch
// (no spurious conflicts on that run). For "something looks out of sync".
export const resetSyncState = (): void => {
  COLLECTION_PATHS.forEach(path => localStorage.removeItem(watermarkKey(path)));
  clearBaselines(COLLECTION_PATHS);
};

// Cosmetic — no current-password confirmation, matching the server route.
export const updateDisplayName = async (displayName: string): Promise<void> => {
  await authorizedRequest('/account/profile', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
  localStorage.setItem(displayNameKey, displayName);
};

// Changes the login identity, so the server requires currentPassword — see
// server/src/http/routes/account.ts. Updates the locally stored email too,
// so subsequent syncs/logins reflect it without needing to reconnect.
export const updateEmail = async (currentPassword: string, newEmail: string): Promise<void> => {
  await authorizedRequest('/account/email', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, email: newEmail }),
  });
  localStorage.setItem(emailKey, newEmail);
};

// The server signs out every other session on a password change but keeps
// this one valid (see account.ts) — no local state needs to change here.
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await authorizedRequest('/account/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

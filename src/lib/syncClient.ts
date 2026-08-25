import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course } from '@/data/courses';
import { WorkoutSession } from '@/data/workoutSessions';
import {
  getAllExercisesFromDB, saveExerciseToDB,
  getAllWorkoutsFromDB, saveWorkoutToDB,
  getAllScheduledWorkoutsFromDB, saveScheduledWorkoutToDB,
  getAllCoursesFromDB, saveCourseToDB,
  getAllWorkoutSessionsFromDB, saveWorkoutSessionToDB,
} from './db';

// Talks to the optional self-hosted sync server (server/). See
// docs/self-hosted-sync.md. Everything here is a no-op path if the user
// never configures a server — nothing in this file runs unless login() has
// been called successfully.

const STORAGE_PREFIX = 'workout-buddy-sync';
const serverUrlKey = `${STORAGE_PREFIX}:serverUrl`;
const tokenKey = `${STORAGE_PREFIX}:token`;
const emailKey = `${STORAGE_PREFIX}:email`;
const watermarkKey = (collection: string) => `${STORAGE_PREFIX}:watermark:${collection}`;
const lastSyncedAtKey = `${STORAGE_PREFIX}:lastSyncedAt`;

export const getServerUrl = (): string | null => localStorage.getItem(serverUrlKey);
export const getLoggedInEmail = (): string | null => localStorage.getItem(emailKey);
export const isConnected = (): boolean => !!(localStorage.getItem(serverUrlKey) && localStorage.getItem(tokenKey));
// Persisted (not just component state) so a background sync — which runs
// independent of whatever page/dialog happens to be mounted — still shows
// up next time the sync UI is opened, rather than only reflecting whichever
// sync last happened to run while that UI was on screen.
export const getLastSyncedAt = (): string | null => localStorage.getItem(lastSyncedAtKey);

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

  const { token } = await response.json() as { token: string };
  localStorage.setItem(serverUrlKey, url);
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(emailKey, email);
};

const COLLECTION_PATHS = ['exercises', 'workouts', 'scheduledWorkouts', 'courses', 'workoutSessions'];

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
  localStorage.removeItem(lastSyncedAtKey);
  COLLECTION_PATHS.forEach(path => localStorage.removeItem(watermarkKey(path)));
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

interface CollectionSyncConfig<T extends SyncedRecord> {
  path: string;
  getAll: () => Promise<T[]>;
  save: (item: T) => Promise<void>;
}

const syncCollection = async <T extends SyncedRecord>(config: CollectionSyncConfig<T>): Promise<CollectionSyncResult> => {
  const { path, getAll, save } = config;

  // Records created before sync was configured (or before this field
  // existed at all) may not have updatedAt yet. Backfill and persist it
  // rather than silently excluding them from every future sync.
  const localItems = await Promise.all((await getAll()).map(async item => {
    if (item.updatedAt) return item;
    const stamped = { ...item, updatedAt: new Date().toISOString() };
    await save(stamped);
    return stamped;
  }));

  // Push first: cheap at personal-library scale to push everything rather
  // than track a per-record dirty flag, and the server's upsert is
  // idempotent, so re-pushing unchanged rows is harmless. The response is
  // the authoritative post-conflict state — save it back locally in case
  // this device's own write lost a conflict to another device's newer one.
  const pushed = await push(path, localItems);
  await Promise.all(pushed.map(item => save(item)));

  // Then pull anything changed on the server since our last watermark
  // (everything, on a first sync) and merge it in.
  const watermark = localStorage.getItem(watermarkKey(path)) ?? undefined;
  const { items: pulled, serverTime } = await pull<T>(path, watermark);
  await Promise.all(pulled.map(item => save(item)));

  localStorage.setItem(watermarkKey(path), serverTime);
  return { collection: path, pushed: pushed.length, pulled: pulled.length };
};

// Runs every collection in turn. Deliberately sequential and fail-fast: if
// one collection's sync fails partway through, the caller sees the error
// and can retry, rather than this silently reporting partial success.
export const syncAll = async (): Promise<CollectionSyncResult[]> => {
  const results = [
    await syncCollection<Exercise>({ path: 'exercises', getAll: getAllExercisesFromDB, save: saveExerciseToDB }),
    await syncCollection<WorkoutEntry>({ path: 'workouts', getAll: getAllWorkoutsFromDB, save: saveWorkoutToDB }),
    await syncCollection<ScheduledWorkout>({ path: 'scheduledWorkouts', getAll: getAllScheduledWorkoutsFromDB, save: saveScheduledWorkoutToDB }),
    await syncCollection<Course>({ path: 'courses', getAll: getAllCoursesFromDB, save: saveCourseToDB }),
    await syncCollection<WorkoutSession>({ path: 'workoutSessions', getAll: getAllWorkoutSessionsFromDB, save: saveWorkoutSessionToDB }),
  ];
  localStorage.setItem(lastSyncedAtKey, new Date().toISOString());
  return results;
};

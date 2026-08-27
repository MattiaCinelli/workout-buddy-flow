/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-ins for the seven IndexedDB stores. Each store is a
// Map<id, row>; the module under test only ever calls getAll / save /
// remove. Created via vi.hoisted so the (hoisted) vi.mock factory below and
// the test bodies share the same Map instances.
const { stores, STORE_NAMES } = vi.hoisted(() => {
  const STORE_NAMES = [
    'exercises', 'workouts', 'scheduledWorkouts', 'courses',
    'workoutSessions', 'muscleGroups', 'bodyMetrics',
  ];
  const stores: Record<string, Map<string, Record<string, unknown>>> = {};
  for (const name of STORE_NAMES) stores[name] = new Map();
  return { stores, STORE_NAMES };
});

const resetStores = () => {
  for (const name of STORE_NAMES) stores[name].clear();
};

vi.mock('./db', () => {
  const mk = (name: string) => ({
    getAll: async () => [...stores[name].values()].map(row => ({ ...row })),
    save: async (row: { id: string }) => { stores[name].set(row.id, { ...row }); },
    remove: async (id: string) => { stores[name].delete(id); },
  });
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const api = Object.fromEntries(STORE_NAMES.map(name => [name, mk(name)]));
  return {
    getAllExercisesFromDB: api.exercises.getAll, saveExerciseToDB: api.exercises.save, deleteExerciseFromDB: api.exercises.remove,
    getAllWorkoutsFromDB: api.workouts.getAll, saveWorkoutToDB: api.workouts.save, deleteWorkoutFromDB: api.workouts.remove,
    getAllScheduledWorkoutsFromDB: api.scheduledWorkouts.getAll, saveScheduledWorkoutToDB: api.scheduledWorkouts.save, deleteScheduledWorkoutFromDB: api.scheduledWorkouts.remove,
    getAllCoursesFromDB: api.courses.getAll, saveCourseToDB: api.courses.save, deleteCourseFromDB: api.courses.remove,
    getAllWorkoutSessionsFromDB: api.workoutSessions.getAll, saveWorkoutSessionToDB: api.workoutSessions.save, deleteWorkoutSessionFromDB: api.workoutSessions.remove,
    getAllMuscleGroupsFromDB: api.muscleGroups.getAll, saveMuscleGroupToDB: api.muscleGroups.save, deleteMuscleGroupFromDB: api.muscleGroups.remove,
    getAllBodyMetricsFromDB: api.bodyMetrics.getAll, saveBodyMetricToDB: api.bodyMetrics.save, deleteBodyMetricFromDB: api.bodyMetrics.remove,
    // Unused by syncClient but exported by the real module.
    ...Object.fromEntries(STORE_NAMES.map(n => [`bulkSave${cap(n)}ToDB`, async () => {}])),
  };
});

// Keep SEED_IDS empty so tombstone compaction isn't blocked by seed rows.
vi.mock('./seedVersion', () => ({ SEED_IDS: new Set<string>() }));

import {
  changePassword, deleteAccount, getLastSyncedAt, getOtherDeviceCount,
  getServerUrl, getSyncStatus, isConnected, isSyncing, login, logout, resetSyncState, revokeOtherSessions,
  subscribeSyncActivity, syncAll, updateDisplayName, updateEmail,
} from './syncClient';
import { getConflicts, setBaseline } from './syncConflicts';

// --- a minimal fake sync server behind global.fetch -------------------------

interface FakeServer {
  collections: Record<string, Record<string, { updatedAt?: string; deletedAt?: string; id: string }>>;
  settings: { settings: unknown; updatedAt: string } | null;
  failCollection: string | null;
  requests: { method: string; path: string; body: unknown }[];
  serverTime: string;
}
let server: FakeServer;

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
}) as unknown as Response;

const newer = (a?: string, b?: string) => (a ?? '') > (b ?? '');

const fetchMock = vi.fn(async (input: string | URL, init: RequestInit = {}) => {
  const url = new URL(String(input));
  const path = url.pathname;
  const method = (init.method ?? 'GET').toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : undefined;
  server.requests.push({ method, path, body });

  if (path === '/auth/login') return jsonResponse({ token: 'test-token', displayName: 'Tester' });
  if (path === '/auth/logout') return jsonResponse({});
  if (path === '/account/profile' || path === '/account/email') return jsonResponse({ ok: true });
  if (path === '/account/password') return jsonResponse(null, 204);
  if (path === '/account') return jsonResponse(null, 204);
  if (path === '/account/sessions' && method === 'GET') return jsonResponse({ otherDevices: 3 });
  if (path === '/account/sessions/revoke-others') return jsonResponse(null, 204);

  if (path === '/settings') {
    if (method === 'GET') return jsonResponse(server.settings ?? { settings: null, updatedAt: null });
    if (method === 'PUT') {
      if (!server.settings || newer(body.updatedAt, server.settings.updatedAt)) {
        server.settings = { settings: body.settings, updatedAt: body.updatedAt };
      }
      return jsonResponse(server.settings);
    }
  }

  const syncMatch = path.match(/^\/sync\/(\w+)$/);
  if (syncMatch) {
    const name = syncMatch[1];
    if (server.failCollection === name) return jsonResponse({ error: 'server on fire' }, 500);
    server.collections[name] ??= {};
    const table = server.collections[name];
    if (method === 'POST') {
      const incoming = (body[name] ?? []) as { id: string; updatedAt?: string }[];
      const echoed = incoming.map(item => {
        const existing = table[item.id];
        if (!existing || newer(item.updatedAt, existing.updatedAt)) table[item.id] = { ...item };
        return { ...table[item.id] };
      });
      return jsonResponse({ [name]: echoed });
    }
    // GET (pull) — everything, ignoring `since` for simplicity.
    return jsonResponse({ [name]: Object.values(table).map(r => ({ ...r })), serverTime: server.serverTime });
  }

  throw new Error(`unexpected request ${method} ${path}`);
});

beforeEach(() => {
  localStorage.clear();
  resetStores();
  server = {
    collections: {},
    settings: null,
    failCollection: null,
    requests: [],
    serverTime: '2026-09-01T00:00:00.000Z',
  };
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const connect = async () => {
  await login('https://sync.example.test/', 'me@example.test', 'pw');
};

const reqsTo = (path: string) => server.requests.filter(r => r.path === path);

// ---------------------------------------------------------------------------

describe('login / logout / connection state', () => {
  it('login stores a normalised url, token, email and display name', async () => {
    await login('https://sync.example.test///', 'me@example.test', 'pw');
    expect(getServerUrl()).toBe('https://sync.example.test');
    expect(isConnected()).toBe(true);
    expect(localStorage.getItem('workout-buddy-sync:token')).toBe('test-token');
    expect(localStorage.getItem('workout-buddy-sync:displayName')).toBe('Tester');
  });

  it('login throws the server error message on a failed response', async () => {
    fetchMock.mockImplementationOnce(async () => jsonResponse({ error: 'bad credentials' }, 401));
    await expect(login('https://x.test', 'a', 'b')).rejects.toThrow('bad credentials');
    expect(isConnected()).toBe(false);
  });

  it('logout clears all local sync state even when the revoke call fails', async () => {
    await connect();
    localStorage.setItem('workout-buddy-sync:watermark:exercises', 'ts');
    fetchMock.mockImplementationOnce(async () => { throw new Error('network down'); });
    await logout();
    expect(isConnected()).toBe(false);
    expect(getServerUrl()).toBeNull();
    expect(localStorage.getItem('workout-buddy-sync:watermark:exercises')).toBeNull();
  });
});

describe('syncAll — both (bidirectional merge)', () => {
  it('pushes local rows, stores the server echo, pulls, and records the watermark + lastSyncedAt', async () => {
    await connect();
    stores.exercises.set('e1', { id: 'e1', name: 'Squat', updatedAt: '2026-01-01T00:00:00.000Z' });
    server.collections.workouts = { w1: { id: 'w1', updatedAt: '2026-05-01T00:00:00.000Z' } };

    const results = await syncAll('both');

    // pushed our exercise up
    expect(server.collections.exercises.e1).toMatchObject({ id: 'e1', name: 'Squat' });
    // pulled the server's workout down
    expect(stores.workouts.get('w1')).toMatchObject({ id: 'w1' });
    // watermark saved from the GET response
    expect(localStorage.getItem('workout-buddy-sync:watermark:exercises')).toBe(server.serverTime);
    expect(getLastSyncedAt()).not.toBeNull();
    expect(results).toHaveLength(7);
    expect(results[0]).toMatchObject({ collection: 'exercises', pushed: 1 });
  });

  it('adopts the server version when our push loses the last-write-wins race', async () => {
    await connect();
    stores.exercises.set('e1', { id: 'e1', name: 'mine', updatedAt: '2026-01-01T00:00:00.000Z' });
    server.collections.exercises = { e1: { id: 'e1', name: 'theirs', updatedAt: '2026-08-01T00:00:00.000Z' } as never };

    await syncAll('both');

    expect(stores.exercises.get('e1')).toMatchObject({ name: 'theirs' });
  });

  it('records a conflict when a locally-edited row is overwritten by a newer server row', async () => {
    await connect();
    setBaseline('exercises', { e1: '2026-01-01T00:00:00.000Z' }); // what we last synced
    stores.exercises.set('e1', { id: 'e1', name: 'my edit', updatedAt: '2026-06-01T00:00:00.000Z' });
    server.collections.exercises = { e1: { id: 'e1', name: 'their edit', updatedAt: '2026-07-01T00:00:00.000Z' } as never };

    await syncAll('both');

    const conflicts = getConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ collection: 'exercises', id: 'e1' });
  });

  it('compacts an accepted local tombstone after the push', async () => {
    await connect();
    stores.exercises.set('gone', { id: 'gone', deletedAt: '2026-02-02T00:00:00.000Z', updatedAt: '2026-02-02T00:00:00.000Z' });

    await syncAll('both');

    expect(stores.exercises.has('gone')).toBe(false); // local row dropped
    expect(server.collections.exercises.gone).toMatchObject({ deletedAt: expect.any(String) }); // server keeps the tombstone
  });

  it('backfills updatedAt on a row that has none', async () => {
    await connect();
    stores.exercises.set('e1', { id: 'e1', name: 'legacy' });

    await syncAll('both');

    expect(stores.exercises.get('e1')!.updatedAt).toEqual(expect.any(String));
  });
});

describe('syncAll — one-way modes', () => {
  it('push: bumps updatedAt and never issues a GET /sync', async () => {
    await connect();
    stores.exercises.set('e1', { id: 'e1', name: 'x', updatedAt: '2020-01-01T00:00:00.000Z' });
    const before = Date.now();

    await syncAll('push');

    expect(reqsTo('/sync/exercises').some(r => r.method === 'GET')).toBe(false);
    expect(reqsTo('/sync/exercises').some(r => r.method === 'POST')).toBe(true);
    expect(new Date(stores.exercises.get('e1')!.updatedAt as string).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('pull: never issues a POST /sync and applies server rows over local', async () => {
    await connect();
    stores.exercises.set('e1', { id: 'e1', name: 'local only', updatedAt: '2030-01-01T00:00:00.000Z' });
    server.collections.exercises = { e1: { id: 'e1', name: 'server wins', updatedAt: '2000-01-01T00:00:00.000Z' } as never };

    await syncAll('pull');

    expect(reqsTo('/sync/exercises').some(r => r.method === 'POST')).toBe(false);
    expect(stores.exercises.get('e1')).toMatchObject({ name: 'server wins' });
  });
});

describe('syncAll — settings and failures', () => {
  it('PUTs settings after the collections on a both sync', async () => {
    await connect();
    await syncAll('both');
    expect(reqsTo('/settings').some(r => r.method === 'PUT')).toBe(true);
  });

  it('a 404 on /settings does not fail the whole sync', async () => {
    await connect();
    const realImpl = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).endsWith('/settings')) return jsonResponse({ error: 'not found' }, 404);
      return realImpl(input, init as RequestInit);
    });

    await expect(syncAll('both')).resolves.toHaveLength(7);
    expect(getLastSyncedAt()).not.toBeNull();
  });

  it('a failing collection records lastError and rethrows', async () => {
    await connect();
    server.failCollection = 'workouts';

    await expect(syncAll('both')).rejects.toThrow('server on fire');
    const status = getSyncStatus();
    expect(status.lastError).toContain('server on fire');
    expect(status.lastErrorAt).not.toBeNull();
  });

  it('clears lastError after a later successful sync', async () => {
    await connect();
    server.failCollection = 'workouts';
    await expect(syncAll('both')).rejects.toThrow();
    server.failCollection = null;
    await syncAll('both');
    expect(getSyncStatus().lastError).toBeNull();
  });
});

describe('sync activity signal', () => {
  it('isSyncing is true during syncAll and false afterwards, and notifies subscribers', async () => {
    await connect();
    const seen: boolean[] = [];
    const unsubscribe = subscribeSyncActivity(() => seen.push(isSyncing()));

    expect(isSyncing()).toBe(false);
    const pending = syncAll('both');
    expect(isSyncing()).toBe(true);
    await pending;
    expect(isSyncing()).toBe(false);

    expect(seen[0]).toBe(true);
    expect(seen.at(-1)).toBe(false);
    unsubscribe();
  });
});

describe('resetSyncState', () => {
  it('clears watermarks and the settings snapshot', async () => {
    await connect();
    localStorage.setItem('workout-buddy-sync:watermark:courses', 'ts');
    localStorage.setItem('workout-buddy-sync:settings:snapshot', '{"json":"{}","updatedAt":"t"}');

    resetSyncState();

    expect(localStorage.getItem('workout-buddy-sync:watermark:courses')).toBeNull();
    expect(localStorage.getItem('workout-buddy-sync:settings:snapshot')).toBeNull();
  });
});

describe('account operations', () => {
  it('updateDisplayName PATCHes and updates local storage', async () => {
    await connect();
    await updateDisplayName('New Name');
    const req = reqsTo('/account/profile')[0];
    expect(req.method).toBe('PATCH');
    expect(req.body).toEqual({ displayName: 'New Name' });
    expect(localStorage.getItem('workout-buddy-sync:displayName')).toBe('New Name');
  });

  it('updateEmail PATCHes with the current password and updates local storage', async () => {
    await connect();
    await updateEmail('pw', 'new@example.test');
    expect(reqsTo('/account/email')[0].body).toEqual({ currentPassword: 'pw', email: 'new@example.test' });
    expect(localStorage.getItem('workout-buddy-sync:email')).toBe('new@example.test');
  });

  it('changePassword POSTs and keeps the session (no local change)', async () => {
    await connect();
    await changePassword('old', 'newlongpassword');
    expect(reqsTo('/account/password')[0].method).toBe('POST');
    expect(isConnected()).toBe(true);
  });

  it('getOtherDeviceCount returns the server count', async () => {
    await connect();
    await expect(getOtherDeviceCount()).resolves.toBe(3);
  });

  it('revokeOtherSessions POSTs and leaves this session connected', async () => {
    await connect();
    await revokeOtherSessions();
    expect(reqsTo('/account/sessions/revoke-others')[0].method).toBe('POST');
    expect(isConnected()).toBe(true);
  });

  it('deleteAccount DELETEs then wipes local sync state', async () => {
    await connect();
    await deleteAccount('pw');
    expect(reqsTo('/account')[0].method).toBe('DELETE');
    expect(isConnected()).toBe(false);
  });

  it('an authorized request without a connection throws', async () => {
    await expect(updateDisplayName('x')).rejects.toThrow(/Not connected/);
  });
});

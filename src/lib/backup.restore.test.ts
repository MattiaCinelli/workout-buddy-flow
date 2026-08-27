/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { setCustomTrack } = vi.hoisted(() => ({ setCustomTrack: vi.fn(async () => {}) }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('./customAudio', () => ({ setCustomTrack, getCustomTrack: vi.fn(async () => null) }));

import { restoreBackup, type WorkoutBuddyBackup } from './backup';
import { getDB } from './db';

const emptyV2Data = () => ({
  exercises: [], workouts: [], workoutSessions: [], scheduledWorkouts: [], courses: [],
  muscleGroups: [], bodyMetrics: [],
});

beforeEach(async () => {
  localStorage.clear();
  const db = await getDB();
  await Promise.all([...db.objectStoreNames].map(name => db.clear(name)));
});
afterEach(() => vi.clearAllMocks());

describe('restoreBackup', () => {
  it('replaces the contents of every store with the backup', async () => {
    const db = await getDB();
    await db.put('exercises', { id: 'old', name: 'stale' } as never);

    const backup = {
      format: 'workout-buddy-backup', version: 3, exportedAt: '2026-01-01T00:00:00.000Z',
      data: { ...emptyV2Data(), exercises: [{ id: 'new', name: 'fresh' }] as never },
      preferences: {},
    } satisfies WorkoutBuddyBackup;

    await restoreBackup(backup);

    const rows = await (await getDB()).getAll('exercises');
    expect(rows.map((r: { id: string }) => r.id)).toEqual(['new']); // old row gone
  });

  it('leaves muscleGroups / bodyMetrics untouched when restoring a v1 file', async () => {
    const db = await getDB();
    await db.put('muscleGroups', { id: 'mg-keep', name: 'Back' } as never);
    await db.put('exercises', { id: 'ex-old' } as never);

    await restoreBackup({
      format: 'workout-buddy-backup', version: 1, exportedAt: '2025-01-01T00:00:00.000Z',
      data: { exercises: [{ id: 'ex-new' }] as never, workouts: [], workoutSessions: [], scheduledWorkouts: [], courses: [] },
    });

    expect((await (await getDB()).getAll('exercises')).map((r: { id: string }) => r.id)).toEqual(['ex-new']);
    expect((await (await getDB()).getAll('muscleGroups')).map((r: { id: string }) => r.id)).toEqual(['mg-keep']);
  });

  it('restores whitelisted v3 preferences and ignores unknown keys', async () => {
    await restoreBackup({
      format: 'workout-buddy-backup', version: 3, exportedAt: '2026-01-01T00:00:00.000Z',
      data: emptyV2Data() as never,
      preferences: { theme: 'dark', 'evil-key': 'nope' },
    });

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('evil-key')).toBeNull();
  });

  it('hands a valid audio track to setCustomTrack', async () => {
    await restoreBackup({
      format: 'workout-buddy-backup', version: 3, exportedAt: '2026-01-01T00:00:00.000Z',
      data: emptyV2Data() as never,
      preferences: {},
      audioTrack: { name: 'bed', type: 'audio/wav', dataUrl: 'data:audio/wav;base64,UklGRg==' },
    });
    expect(setCustomTrack).toHaveBeenCalledOnce();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSeedVersion, pendingSeedAdditions, setSeedVersion } from './seedVersion';

const createLocalStorageStub = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
  };
};

describe('seed version marker', () => {
  beforeEach(() => vi.stubGlobal('localStorage', createLocalStorageStub()));

  it('defaults to 0 and round-trips per collection', () => {
    expect(getSeedVersion('exercises')).toBe(0);
    setSeedVersion('exercises', 3);
    expect(getSeedVersion('exercises')).toBe(3);
    expect(getSeedVersion('workouts')).toBe(0);
  });
});

describe('pendingSeedAdditions', () => {
  const defaults = [{ id: '1' }, { id: '2' }, { id: '3' }];

  it('returns nothing when the store is already at or past the current version', () => {
    expect(pendingSeedAdditions([{ id: '1' }], defaults, 2, 2)).toEqual([]);
    expect(pendingSeedAdditions([{ id: '1' }], defaults, 5, 2)).toEqual([]);
  });

  it('adds only defaults the store has never seen', () => {
    expect(pendingSeedAdditions([{ id: '1' }, { id: '2' }], defaults, 0, 1)).toEqual([{ id: '3' }]);
  });

  it('does not re-add a default the user deleted (its tombstone row still counts as known)', () => {
    const stored = [{ id: '1' }, { id: '2', deletedAt: '2026-01-01T00:00:00.000Z' }];
    expect(pendingSeedAdditions(stored, defaults, 0, 1).map(d => d.id)).toEqual(['3']);
  });

  it('is a no-op when there are no defaults', () => {
    expect(pendingSeedAdditions([{ id: '1' }], [], 0, 1)).toEqual([]);
  });
});

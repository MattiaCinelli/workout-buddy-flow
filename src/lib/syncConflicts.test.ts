import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addConflicts, clearConflicts, detectOverwrites, getConflicts, removeConflict,
} from './syncConflicts';

const createLocalStorageStub = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
  };
};

beforeEach(() => vi.stubGlobal('localStorage', createLocalStorageStub()));

describe('detectOverwrites', () => {
  const base = { a: 't1', b: 't1' };

  it('flags a record we edited locally that came back as a different version', () => {
    const mine = [{ id: 'a', updatedAt: 't2-mine', title: 'Leg Day' }];
    const conflicts = detectOverwrites('workouts', base, mine, [{ id: 'a', updatedAt: 't2-theirs' }], 'now');
    expect(conflicts).toEqual([{
      collection: 'workouts', id: 'a', label: 'Leg Day',
      mineUpdatedAt: 't2-mine', theirsUpdatedAt: 't2-theirs', theirsDeleted: false,
      detectedAt: 'now', mine: { id: 'a', updatedAt: 't2-mine', title: 'Leg Day' },
    }]);
  });

  it('ignores records we never changed since the last sync', () => {
    expect(detectOverwrites('workouts', base,
      [{ id: 'a', updatedAt: 't1' }], [{ id: 'a', updatedAt: 't1' }])).toEqual([]);
  });

  it('ignores records the server has never seen (new, not conflicted)', () => {
    expect(detectOverwrites('workouts', base,
      [{ id: 'new', updatedAt: 't2' }], [{ id: 'new', updatedAt: 't2' }])).toEqual([]);
  });

  it('does not flag when our push won', () => {
    expect(detectOverwrites('workouts', base,
      [{ id: 'a', updatedAt: 't2' }], [{ id: 'a', updatedAt: 't2' }])).toEqual([]);
  });

  it('marks a conflict where the winning version was a deletion', () => {
    const mine = [{ id: 'b', updatedAt: 't2', name: 'Row' }];
    const [conflict] = detectOverwrites('workouts', base, mine, [{ id: 'b', updatedAt: 't3', deletedAt: 't3' }]);
    expect(conflict).toMatchObject({ id: 'b', theirsDeleted: true, label: 'Row' });
  });
});

describe('conflict list storage', () => {
  it('de-dupes by collection+id, newest wins, and survives removal', () => {
    addConflicts([
      { collection: 'workouts', id: 'a', label: 'v1', mineUpdatedAt: '', theirsUpdatedAt: '', theirsDeleted: false, detectedAt: '1', mine: {} },
    ]);
    addConflicts([
      { collection: 'workouts', id: 'a', label: 'v2', mineUpdatedAt: '', theirsUpdatedAt: '', theirsDeleted: false, detectedAt: '2', mine: {} },
      { collection: 'exercises', id: 'x', label: 'ex', mineUpdatedAt: '', theirsUpdatedAt: '', theirsDeleted: false, detectedAt: '2', mine: {} },
    ]);
    expect(getConflicts().map(c => `${c.collection}:${c.id}:${c.label}`)).toEqual(['workouts:a:v2', 'exercises:x:ex']);

    removeConflict('workouts', 'a');
    expect(getConflicts().map(c => c.id)).toEqual(['x']);

    clearConflicts();
    expect(getConflicts()).toEqual([]);
  });
});

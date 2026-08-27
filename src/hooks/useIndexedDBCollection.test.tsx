/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useIndexedDBCollection } from './useIndexedDBCollection';

let connected = false;
vi.mock('@/lib/syncClient', () => ({ isConnected: () => connected }));

interface Row { id: string; name?: string; updatedAt?: string; deletedAt?: string }

const makeStore = (initial: Row[] = []) => {
  let rows = initial.map(r => ({ ...r }));
  return {
    peek: () => rows,
    getAll: vi.fn(async () => rows.map(r => ({ ...r }))),
    save: vi.fn(async (item: Row) => { rows = [...rows.filter(r => r.id !== item.id), item]; }),
    remove: vi.fn(async (id: string) => { rows = rows.filter(r => r.id !== id); }),
    bulkSave: vi.fn(async (items: Row[]) => {
      for (const it of items) rows = [...rows.filter(r => r.id !== it.id), it];
    }),
  };
};

const config = (store: ReturnType<typeof makeStore>, extra: Partial<Parameters<typeof useIndexedDBCollection<Row>>[0]> = {}) => ({
  getAll: store.getAll, save: store.save, remove: store.remove, bulkSave: store.bulkSave,
  errorMessage: 'boom', ...extra,
});

beforeEach(() => {
  connected = false;
  localStorage.clear();
  vi.clearAllMocks();
});

describe('useIndexedDBCollection', () => {
  it('seeds defaults into an empty store and records the seed version', async () => {
    const store = makeStore([]);
    const { result } = renderHook(() => useIndexedDBCollection<Row>(
      config(store, { defaults: [{ id: 'a' }, { id: 'b' }], seedKey: 'rows' }),
    ));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map(i => i.id)).toEqual(['a', 'b']);
    expect(store.bulkSave).toHaveBeenCalledOnce();
    expect(localStorage.getItem('workout-buddy-seed-version:rows')).toBe('1');
  });

  it('hides tombstoned rows from the in-memory list', async () => {
    const store = makeStore([{ id: 'a' }, { id: 'b', deletedAt: '2026-01-01T00:00:00.000Z' }]);
    const { result } = renderHook(() => useIndexedDBCollection<Row>(config(store)));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map(i => i.id)).toEqual(['a']);
  });

  it('additively adds a newly-shipped default to an existing store, once', async () => {
    const store = makeStore([{ id: 'a', name: 'mine' }]);
    const { result } = renderHook(() => useIndexedDBCollection<Row>(
      config(store, { defaults: [{ id: 'a' }, { id: 'b' }], seedKey: 'rows' }),
    ));
    await waitFor(() => expect(result.current.items.map(i => i.id).sort()).toEqual(['a', 'b']));
    // the user's own copy of 'a' is untouched; only 'b' was written
    expect(store.peek().find(r => r.id === 'a')?.name).toBe('mine');
    expect(store.bulkSave).toHaveBeenCalledWith([expect.objectContaining({ id: 'b' })]);

    // a second mount (seed version now current) does not write again
    store.bulkSave.mockClear();
    const second = renderHook(() => useIndexedDBCollection<Row>(
      config(store, { defaults: [{ id: 'a' }, { id: 'b' }], seedKey: 'rows' }),
    ));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(store.bulkSave).not.toHaveBeenCalled();
  });

  it('does not resurrect a deleted default via migration', async () => {
    const store = makeStore([{ id: 'a' }, { id: 'b', deletedAt: '2026-01-01T00:00:00.000Z' }]);
    const { result } = renderHook(() => useIndexedDBCollection<Row>(
      config(store, { defaults: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], seedKey: 'rows' }),
    ));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map(i => i.id).sort()).toEqual(['a', 'c']);
    expect(store.bulkSave).toHaveBeenCalledWith([expect.objectContaining({ id: 'c' })]);
  });

  it('hard-deletes when offline', async () => {
    const store = makeStore([{ id: 'a' }, { id: 'b' }]);
    const { result } = renderHook(() => useIndexedDBCollection<Row>(config(store)));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.remove('a'); });
    expect(store.remove).toHaveBeenCalledWith('a');
    expect(store.save).not.toHaveBeenCalled();
    expect(result.current.items.map(i => i.id)).toEqual(['b']);
  });

  it('tombstones instead of hard-deleting when a sync server is connected', async () => {
    connected = true;
    const store = makeStore([{ id: 'a' }, { id: 'b' }]);
    const { result } = renderHook(() => useIndexedDBCollection<Row>(config(store)));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.remove('a'); });
    expect(store.remove).not.toHaveBeenCalled();
    expect(store.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', deletedAt: expect.any(String) }));
    expect(result.current.items.map(i => i.id)).toEqual(['b']);
  });

  it('create stamps an id and updatedAt', async () => {
    const store = makeStore([]);
    const { result } = renderHook(() => useIndexedDBCollection<Row>(config(store)));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let created: Row;
    await act(async () => { created = await result.current.create({ name: 'x' }); });
    expect(created!.id).toEqual(expect.any(String));
    expect(created!.updatedAt).toEqual(expect.any(String));
    expect(result.current.items).toHaveLength(1);
  });
});

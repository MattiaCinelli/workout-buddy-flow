import { useCallback, useEffect, useRef, useState } from 'react';

export interface IndexedDBCollectionConfig<T extends { id: string }, StampedKeys extends keyof T = never> {
  getAll: () => Promise<T[]>;
  save: (item: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Bulk-writes seed data; required only when `defaults` is provided. */
  bulkSave?: (items: T[]) => Promise<void>;
  /** Fast path for clearing every record; falls back to per-item `remove` when omitted. */
  clearAll?: () => Promise<void>;
  /** Seed data written once when the store is empty on first load. */
  defaults?: T[];
  /** Logged and surfaced via `error` when a DB operation fails. */
  errorMessage: string;
  /** Applied after every load/create/update so ordering and normalization stay consistent. */
  transform?: (items: T[]) => T[];
  /** Extra fields to stamp onto a new item beyond the generated `id`, e.g. `createdAt`. Removes those keys from `create`'s input type. */
  stamp?: () => Pick<T, StampedKeys>;
}

// Shared load/create/update/delete/error-state plumbing for the app's five
// IndexedDB-backed collections (exercises, workouts, scheduled workouts,
// courses, workout sessions). Each domain hook supplies the DB functions and
// any collection-specific transform, then layers its own specialized
// operations (e.g. course completion) on top of the returned primitives.
export function useIndexedDBCollection<T extends { id: string }, StampedKeys extends keyof T = never>(
  config: IndexedDBCollectionConfig<T, StampedKeys>
) {
  const configRef = useRef(config);
  configRef.current = config;

  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Only the very first load sets isLoading — pages gate a full-page
  // spinner on it ("nothing to show yet"). A later refresh (e.g. after a
  // sync pull) already has data on screen; toggling the same flag for that
  // briefly unmounts any loading-gated parent page, and everything
  // rendered under it, including whatever triggered the refresh in the
  // first place. See docs/self-hosted-sync.md for how this was found.
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async () => {
    const { getAll, bulkSave, defaults, errorMessage, transform } = configRef.current;
    const isFirstLoad = !hasLoadedOnceRef.current;
    try {
      if (isFirstLoad) setIsLoading(true);
      let loaded = await getAll();
      if (loaded.length === 0 && defaults?.length) {
        if (bulkSave) await bulkSave(defaults);
        loaded = defaults;
      }
      setItems(transform ? transform(loaded) : loaded);
      setError(null);
    } catch (err) {
      console.error(errorMessage, err);
      setError(errorMessage);
      setItems(defaults ?? []);
    } finally {
      hasLoadedOnceRef.current = true;
      if (isFirstLoad) setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (data: Omit<T, 'id' | StampedKeys>): Promise<T> => {
    const { save, transform, stamp } = configRef.current;
    // updatedAt is stamped unconditionally, whether or not this collection
    // is synced yet — it's the watermark the (optional) self-hosted sync
    // layer uses to tell which device's write is newer. See
    // docs/self-hosted-sync.md.
    const newItem = { ...data, ...(stamp ? stamp() : {}), updatedAt: new Date().toISOString(), id: crypto.randomUUID() } as unknown as T;
    await save(newItem);
    setItems(prev => {
      const next = [...prev, newItem];
      return transform ? transform(next) : next;
    });
    return newItem;
  }, []);

  const update = useCallback(async (id: string, updates: Partial<T>): Promise<T | null> => {
    const { save, transform } = configRef.current;
    const existing = itemsRef.current.find(item => item.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() } as T;
    await save(updated);
    setItems(prev => {
      const next = prev.map(item => item.id === id ? updated : item);
      return transform ? transform(next) : next;
    });
    return updated;
  }, []);

  const remove = useCallback(async (id: string): Promise<T | null> => {
    const target = itemsRef.current.find(item => item.id === id);
    if (!target) return null;
    await configRef.current.remove(id);
    setItems(prev => prev.filter(item => item.id !== id));
    return target;
  }, []);

  const clearAll = useCallback(async (): Promise<void> => {
    const { clearAll: clearAllFromDB, remove: removeFromDB } = configRef.current;
    if (clearAllFromDB) {
      await clearAllFromDB();
    } else {
      for (const item of itemsRef.current) await removeFromDB(item.id);
    }
    setItems([]);
  }, []);

  const getById = useCallback((id: string): T | undefined => {
    return itemsRef.current.find(item => item.id === id);
  }, []);

  return { items, isLoading, error, load, create, update, remove, clearAll, getById };
}

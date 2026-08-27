import { DBSchema, openDB, IDBPDatabase } from 'idb';

// One optional user-supplied backing track for guided workouts, kept in its
// own tiny IndexedDB database (separate from the app's main store, so a
// multi-MB blob never touches the sync/backup path). Device-local only.

interface AudioDB extends DBSchema {
  track: { key: string; value: { id: string; blob: Blob; name: string; type: string } };
}

const DB_NAME = 'workout-buddy-audio';
const TRACK_KEY = 'custom-track';
export const MAX_TRACK_BYTES = 25 * 1024 * 1024;

let dbPromise: Promise<IDBPDatabase<AudioDB>> | null = null;
const getDB = () => (dbPromise ??= openDB<AudioDB>(DB_NAME, 1, {
  upgrade(db) { db.createObjectStore('track', { keyPath: 'id' }); },
}));

export interface CustomTrack {
  blob: Blob;
  name: string;
  type: string;
}

export const getCustomTrack = async (): Promise<CustomTrack | null> => {
  try {
    const record = await (await getDB()).get('track', TRACK_KEY);
    return record ? { blob: record.blob, name: record.name, type: record.type } : null;
  } catch (error) {
    console.warn('Could not read custom workout track:', error);
    return null;
  }
};

export const setCustomTrack = async (file: File): Promise<void> => {
  await (await getDB()).put('track', { id: TRACK_KEY, blob: file, name: file.name, type: file.type });
};

export const clearCustomTrack = async (): Promise<void> => {
  await (await getDB()).delete('track', TRACK_KEY);
};

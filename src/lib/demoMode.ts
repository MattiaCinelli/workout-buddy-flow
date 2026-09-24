// Demo mode: show the app to someone else without exposing your own data.
//
// While the flag is set, src/lib/db.ts opens a separate IndexedDB database
// (DEMO_DB_NAME) seeded with a few cartoon exercises and a short made-up
// history. Your real database is never opened, so none of its records or
// pictures can appear. Everything that could leave the device or overwrite
// real state — sync, the automatic phone snapshot, native reminders — is
// switched off for the duration. Switching modes reloads the page because
// the database connection is opened once and memoised.
import { deleteDB } from 'idb';

export const DEMO_MODE_KEY = 'workout-buddy-demo-mode';
export const DEMO_DB_NAME = 'workout-buddy-demo-db';

export const isDemoMode = (): boolean => {
  try { return localStorage.getItem(DEMO_MODE_KEY) === 'true'; } catch { return false; }
};

/** Namespaces a device-preference key so demo edits never touch the real one. */
export const demoScopedKey = (key: string): string => (isDemoMode() ? `${key}:demo` : key);

const reloadToDashboard = () => { window.location.assign('/'); };

/** Starts a fresh demo: any leftover demo database is discarded so every showing begins clean. */
export const enterDemoMode = async (): Promise<void> => {
  try { await deleteDB(DEMO_DB_NAME); } catch { /* a stale demo DB is harmless; the seed only runs on creation */ }
  localStorage.setItem(DEMO_MODE_KEY, 'true');
  reloadToDashboard();
};

export const exitDemoMode = (): void => {
  localStorage.removeItem(DEMO_MODE_KEY);
  reloadToDashboard();
};

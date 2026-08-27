import { Db } from './index';

// Every table that stores per-user synced data. Keep this in lockstep with
// server/src/db/migrations/ — a new synced collection needs an entry here
// too, or deleting an account silently leaves its rows behind. Most are
// keyed by (id, user_id); user_settings is keyed by user_id alone (one
// blob per account) but deletes by user_id just the same.
const SYNCED_TABLES = [
  'exercises',
  'workouts',
  'scheduled_workouts',
  'courses',
  'workout_sessions',
  'muscle_groups',
  'body_metrics',
  'user_settings',
] as const;

// Irreversibly removes the user, all of their sessions, and every synced
// row they own, in one transaction — it either all goes or none of it
// does. There is no tombstone and nothing left to sync: the account is
// simply gone. A device still holding a token just starts failing auth on
// its next sync (the app surfaces that as "reconnect", data stays local).
export const deleteAccount = (db: Db, userId: string): void => {
  const run = db.transaction(() => {
    for (const table of SYNCED_TABLES) {
      db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
    }
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });
  run();
};

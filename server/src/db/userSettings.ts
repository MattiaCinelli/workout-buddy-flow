import { Db } from './index';

export interface StoredUserSettings {
  // Opaque JSON string — the server never parses it. Shape is the client's
  // concern (src/lib/settingsSync.ts).
  data: string;
  updatedAt: string;
}

interface UserSettingsRow {
  data: string;
  updated_at: string;
}

export const getUserSettings = (db: Db, userId: string): StoredUserSettings | undefined => {
  const row = db.prepare('SELECT data, updated_at FROM user_settings WHERE user_id = ?')
    .get(userId) as UserSettingsRow | undefined;
  return row ? { data: row.data, updatedAt: row.updated_at } : undefined;
};

// Last-write-wins on updatedAt, identical in spirit to every per-record
// upsert: the incoming blob only replaces the stored one when its
// updatedAt is strictly newer (or there's nothing stored yet). Always
// returns whatever ended up stored, so the client reconciles against the
// winner rather than assuming its own write took.
export const upsertUserSettings = (
  db: Db,
  userId: string,
  data: string,
  updatedAt: string,
): StoredUserSettings => {
  db.prepare(`
    INSERT INTO user_settings (user_id, data, updated_at)
    VALUES (@userId, @data, @updatedAt)
    ON CONFLICT(user_id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
    WHERE excluded.updated_at > user_settings.updated_at
  `).run({ userId, data, updatedAt });

  return getUserSettings(db, userId)!;
};

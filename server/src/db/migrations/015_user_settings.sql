-- Account-level app preferences (theme, accessibility, reminder lead time,
-- body-profile height). Unlike the seven synced collections this is NOT a
-- list of records — there is exactly one settings blob per user, so the key
-- is user_id alone and there is no id, no tombstone, and no synced_at
-- watermark (the client always fetches the whole row, never "since X").
--
-- `data` is an opaque JSON string whose shape is defined entirely by the
-- client (src/lib/settingsSync.ts). The server never looks inside it — it
-- only does last-write-wins on `updated_at` (the client's clock), exactly
-- like every per-record upsert elsewhere.
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

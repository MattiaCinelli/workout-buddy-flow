-- User-editable muscle-group taxonomy: exercises used to store these as
-- plain freeform strings, then as a fixed hardcoded list — this makes them
-- a real collection a user can add to, rename, or delete, same as any other
-- synced entity. Same shape as every other table: composite (id, user_id)
-- key, updated_at for last-write-wins, deleted_at as a tombstone, synced_at
-- (server clock) as the pull watermark — see 003_synced_at.sql for why that
-- has to be a separate column from updated_at.
CREATE TABLE muscle_groups (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (id, user_id)
);

CREATE INDEX idx_muscle_groups_user_synced ON muscle_groups(user_id, synced_at);

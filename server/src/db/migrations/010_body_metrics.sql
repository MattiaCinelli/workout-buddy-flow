-- Body weight (and future measurements) logged over time, independent of
-- workout sessions. Same shape as every other synced table: composite
-- (id, user_id) key, updated_at for last-write-wins, deleted_at as a
-- tombstone, synced_at (server clock) as the pull watermark.
CREATE TABLE body_metrics (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight REAL NOT NULL,
  notes TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (id, user_id)
);

CREATE INDEX idx_body_metrics_user_synced ON body_metrics(user_id, synced_at);

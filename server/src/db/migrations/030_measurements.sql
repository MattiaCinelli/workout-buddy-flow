-- Self-measured records ("Toe touch gap", "Plank hold", ...). Each logged
-- value is its own row, so two devices logging values never overwrite one
-- another; rows of the same thing share measurement_id. Same shape as every
-- other synced table: composite (id, user_id) key, updated_at for
-- last-write-wins, deleted_at as a tombstone, synced_at (server clock) as the
-- pull watermark.
CREATE TABLE measurements (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measurement_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL,
  better TEXT NOT NULL,
  value REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (id, user_id)
);

CREATE INDEX idx_measurements_user_synced ON measurements(user_id, synced_at);

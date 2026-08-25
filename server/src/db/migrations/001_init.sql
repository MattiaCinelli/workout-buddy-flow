-- Accounts are admin-created only; there is no public registration endpoint.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Opaque server-side sessions (not JWTs) so logout / password change can
-- revoke a session immediately by deleting the row, rather than waiting
-- for a token to expire.
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- First synced collection. muscle_groups is stored as a JSON-encoded array
-- to mirror the client's Exercise type without a separate join table.
--
-- deleted_at is a tombstone, not a hard delete: a device that deletes an
-- exercise while another device is offline has no way to learn "this is
-- gone" from a row that no longer exists. Sync responses include recently
-- deleted rows so other clients can remove them locally too.
-- (id, user_id) is the primary key, not id alone: two different users'
-- devices both generate ids with crypto.randomUUID(), so a collision is
-- astronomically unlikely but not impossible, and a per-user composite key
-- means that if it ever happened, both rows would simply coexist in their
-- own owner's namespace rather than one silently clobbering the other.
CREATE TABLE exercises (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  muscle_groups TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  image_url TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (id, user_id)
);

-- Every sync pull is "rows for this user changed since timestamp X".
CREATE INDEX idx_exercises_user_updated ON exercises(user_id, updated_at);

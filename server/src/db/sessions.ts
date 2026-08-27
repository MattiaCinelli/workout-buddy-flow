import { createHash, randomBytes } from 'node:crypto';
import { Db } from './index';

// The `sessions.token` column stores this, never the raw token — so a read
// of the table can't produce a usable bearer token. The raw token exists
// only in the createSession return value and in the client's storage.
const hashToken = (rawToken: string): string =>
  createHash('sha256').update(rawToken).digest('hex');

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface SessionRow {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

const fromRow = (row: SessionRow): Session => ({
  token: row.token,
  userId: row.user_id,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
});

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// The returned `token` is the RAW token — the only moment it is available
// in the clear. The DB row holds only its hash. Callers send this to the
// client; everything server-side afterwards works off the hashed value.
export const createSession = (db: Db, userId: string): Session => {
  const now = new Date();
  const rawToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(rawToken), userId, now.toISOString(), expiresAt);
  return { token: rawToken, userId, createdAt: now.toISOString(), expiresAt };
};

// Every function below takes the RAW token and hashes it internally, so the
// hash never leaves this module. Returns the session only if it exists and
// hasn't expired, so callers don't separately have to check expiresAt. The
// returned `token` is the raw one that was passed in.
export const getValidSession = (db: Db, token: string): Session | undefined => {
  const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(hashToken(token)) as SessionRow | undefined;
  if (!row) return undefined;
  const session = { ...fromRow(row), token };
  if (new Date(session.expiresAt).getTime() <= Date.now()) return undefined;
  return session;
};

export const deleteSession = (db: Db, token: string): void => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(hashToken(token));
};

// Used after a password change: every other device gets signed out and has
// to re-authenticate with the new password, while the session that made
// the change (which already proved it knows the new password) stays valid.
export const deleteOtherSessionsForUser = (db: Db, userId: string, keepToken: string): void => {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(userId, hashToken(keepToken));
};

// Every session for the user, no exceptions. Used by the admin
// reset-password CLI (there is no current session to keep — the point is
// that whoever held the old password is locked out) and by account
// deletion.
export const deleteAllSessionsForUser = (db: Db, userId: string): void => {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
};

// How many *other* live sessions the user has — everything except the
// caller's own token and anything already expired. Lets the account UI say
// "signed in on N other devices" and decide whether to offer a revoke.
export const countOtherSessionsForUser = (db: Db, userId: string, keepToken: string): number => {
  const row = db
    .prepare('SELECT COUNT(*) AS count FROM sessions WHERE user_id = ? AND token != ? AND expires_at > ?')
    .get(userId, hashToken(keepToken), new Date().toISOString()) as { count: number };
  return row.count;
};

export const deleteExpiredSessions = (db: Db): void => {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
};

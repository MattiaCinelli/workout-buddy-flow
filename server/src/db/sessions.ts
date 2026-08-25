import { randomBytes } from 'node:crypto';
import { Db } from './index';

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

export const createSession = (db: Db, userId: string): Session => {
  const now = new Date();
  const session: Session = {
    token: randomBytes(32).toString('hex'),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS).toISOString(),
  };
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(session.token, session.userId, session.createdAt, session.expiresAt);
  return session;
};

// Returns the session only if it exists and hasn't expired, so callers
// don't separately have to remember to check expiresAt.
export const getValidSession = (db: Db, token: string): Session | undefined => {
  const row = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as SessionRow | undefined;
  if (!row) return undefined;
  const session = fromRow(row);
  if (new Date(session.expiresAt).getTime() <= Date.now()) return undefined;
  return session;
};

export const deleteSession = (db: Db, token: string): void => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
};

export const deleteExpiredSessions = (db: Db): void => {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
};

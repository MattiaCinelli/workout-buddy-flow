import { randomUUID } from 'node:crypto';
import { Db } from './index';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  passwordHash: string;
  createdAt: string;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  password_hash: string;
  created_at: string;
}

const fromRow = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name ?? undefined,
  passwordHash: row.password_hash,
  createdAt: row.created_at,
});

// Used only by the admin CLI (create-user) — there is no public registration
// endpoint, so this is never reachable from an HTTP request.
export const createUser = (db: Db, email: string, passwordHash: string): User => {
  const user: User = { id: randomUUID(), email, passwordHash, createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(user.id, user.email, user.passwordHash, user.createdAt);
  return user;
};

export const getUserByEmail = (db: Db, email: string): User | undefined => {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  return row ? fromRow(row) : undefined;
};

export const getUserById = (db: Db, id: string): User | undefined => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? fromRow(row) : undefined;
};

// Cosmetic only — no password confirmation needed to change this, unlike
// email/password below.
export const updateDisplayName = (db: Db, userId: string, displayName: string): User => {
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, userId);
  return getUserById(db, userId)!;
};

// Caller is responsible for verifying the current password and email
// uniqueness before calling this — this function just writes.
export const updateEmail = (db: Db, userId: string, email: string): User => {
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, userId);
  return getUserById(db, userId)!;
};

export const updatePasswordHash = (db: Db, userId: string, passwordHash: string): void => {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
};

import { randomUUID } from 'node:crypto';
import { Db } from './index';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

const fromRow = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
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

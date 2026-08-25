import { openDb } from '../db';
import { createUser } from '../db/users';
import { hashPassword } from '../auth/password';
import { buildApp } from '../http/app';

export const PASSWORD = 'correct horse battery staple';

// Two pre-created, logged-in users on a shared in-memory db + app — every
// sync collection's tests need at least one authenticated caller, and the
// cross-user isolation tests need two.
export const setupTwoUsers = async () => {
  const db = openDb(':memory:');
  const passwordHash = await hashPassword(PASSWORD);
  const alice = createUser(db, 'alice@example.com', passwordHash);
  const bob = createUser(db, 'bob@example.com', passwordHash);
  const app = buildApp(db);

  const tokenFor = async (email: string) => {
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: PASSWORD } });
    return response.json().token as string;
  };

  return { app, alice, bob, aliceToken: await tokenFor(alice.email), bobToken: await tokenFor(bob.email) };
};

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db';
import { createUser } from '../db/users';
import { hashPassword } from '../auth/password';
import { buildApp } from '../http/app';

const PASSWORD = 'correct horse battery staple';

const setup = async () => {
  const db = openDb(':memory:');
  const passwordHash = await hashPassword(PASSWORD);
  const user = createUser(db, 'you@example.com', passwordHash);
  const app = buildApp(db);
  return { app, user };
};

const login = (app: Awaited<ReturnType<typeof setup>>['app'], email: string, password: string) =>
  app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });

test('login with correct credentials returns a session token', async () => {
  const { app } = await setup();
  const response = await login(app, 'you@example.com', PASSWORD);

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(typeof body.token, 'string');
  assert.ok(body.token.length > 0);
});

test('login with the wrong password is rejected', async () => {
  const { app } = await setup();
  const response = await login(app, 'you@example.com', 'wrong password');
  assert.equal(response.statusCode, 401);
});

test('login with an unknown email gets the same response as a wrong password', async () => {
  const { app } = await setup();
  const wrongPassword = await login(app, 'you@example.com', 'wrong password');
  const unknownEmail = await login(app, 'nobody@example.com', 'wrong password');

  assert.equal(wrongPassword.statusCode, unknownEmail.statusCode);
  assert.deepEqual(wrongPassword.json(), unknownEmail.json());
});

test('login requires both email and password', async () => {
  const { app } = await setup();
  const missingPassword = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'you@example.com' } });
  const missingBody = await app.inject({ method: 'POST', url: '/auth/login', payload: {} });

  assert.equal(missingPassword.statusCode, 400);
  assert.equal(missingBody.statusCode, 400);
});

test('a protected route rejects a request with no token', async () => {
  const { app } = await setup();
  const response = await app.inject({ method: 'POST', url: '/auth/logout' });
  assert.equal(response.statusCode, 401);
});

test('a protected route rejects an invalid token', async () => {
  const { app } = await setup();
  const response = await app.inject({
    method: 'POST',
    url: '/auth/logout',
    headers: { authorization: 'Bearer not-a-real-token' },
  });
  assert.equal(response.statusCode, 401);
});

test('logout revokes the session so it can no longer be used', async () => {
  const { app } = await setup();
  const { token } = (await login(app, 'you@example.com', PASSWORD)).json();

  const firstLogout = await app.inject({
    method: 'POST',
    url: '/auth/logout',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(firstLogout.statusCode, 204);

  const secondLogout = await app.inject({
    method: 'POST',
    url: '/auth/logout',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(secondLogout.statusCode, 401);
});

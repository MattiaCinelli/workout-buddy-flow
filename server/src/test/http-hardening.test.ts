import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers, PASSWORD } from './syncTestHelpers';
import { createLoginThrottle } from '../auth/loginThrottle';

const exercise = (overrides: Record<string, unknown> = {}) => ({
  id: 'ex-1', name: 'Squat', category: 'strength', muscleGroups: ['legs'],
  difficulty: 'beginner', updatedAt: '2026-01-01T00:00:00.000Z', ...overrides,
});

test('an exercise videoUrl must be an https link', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };
  for (const videoUrl of ['javascript:alert(1)', 'data:text/html,<script>1</script>', 'http://example.com/v']) {
    const response = await app.inject({
      method: 'POST', url: '/sync/exercises', headers, payload: { exercises: [exercise({ videoUrl })] },
    });
    assert.equal(response.statusCode, 400, `${videoUrl} should be rejected`);
  }

  const ok = await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ videoUrl: 'https://www.youtube.com/watch?v=abc' })] },
  });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().exercises[0].videoUrl, 'https://www.youtube.com/watch?v=abc');
});

test('an unauthenticated request is refused before its body is parsed', async () => {
  const { app } = await setupTwoUsers();
  // Invalid against the exercises schema: if the body were validated first
  // this would be a 400. Auth must win, so the caller learns nothing about
  // the schema and the server never buffers/validates the payload.
  const response = await app.inject({ method: 'POST', url: '/sync/exercises', payload: { exercises: [{ nope: true }] } });
  assert.equal(response.statusCode, 401);
});

test('the login body is capped far below the global sync limit', async () => {
  const { app } = await setupTwoUsers();
  const response = await app.inject({
    method: 'POST', url: '/auth/login',
    payload: { email: 'alice@example.com', password: 'x'.repeat(64 * 1024) },
  });
  assert.equal(response.statusCode, 413);
});

test('repeated failed logins lock the address out, even for the right password', async () => {
  const { app } = await setupTwoUsers();
  const attempt = (password: string) => app.inject({
    method: 'POST', url: '/auth/login', payload: { email: 'alice@example.com', password },
  });

  for (let i = 0; i < 10; i++) assert.equal((await attempt(`wrong-${i}`)).statusCode, 401);

  const locked = await attempt(PASSWORD);
  assert.equal(locked.statusCode, 429);
  assert.ok(Number(locked.headers['retry-after']) > 0);

  // Another account is unaffected.
  const bob = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'bob@example.com', password: PASSWORD } });
  assert.equal(bob.statusCode, 200);
});

test('a successful login clears earlier failures', async () => {
  const { app } = await setupTwoUsers();
  const attempt = (password: string) => app.inject({
    method: 'POST', url: '/auth/login', payload: { email: 'alice@example.com', password },
  });
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 9; i++) await attempt('wrong');
    assert.equal((await attempt(PASSWORD)).statusCode, 200);
  }
});

test('the throttle forgets failures once the window has passed', () => {
  let clock = 0;
  const throttle = createLoginThrottle(() => clock);
  for (let i = 0; i < 10; i++) throttle.recordFailure('a@x.io');
  assert.ok(throttle.retryAfterMs('a@x.io') > 0);
  clock += 15 * 60 * 1000 + 1;
  assert.equal(throttle.retryAfterMs('a@x.io'), 0);
});

test('non-string password fields get a 400, not a 500 with internal error text', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };
  const response = await app.inject({
    method: 'PATCH', url: '/account/email', headers,
    payload: { currentPassword: { nested: true }, email: 'new@example.com' },
  });
  assert.equal(response.statusCode, 400);
  assert.doesNotMatch(response.body, /ERR_INVALID_ARG_TYPE/);
});

test('an unexpected 500 returns a generic message', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  app.db.exec('DROP TABLE user_settings');
  const response = await app.inject({ method: 'GET', url: '/settings', headers: { authorization: `Bearer ${aliceToken}` } });
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), { error: 'Internal Server Error' });
});

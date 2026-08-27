import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers } from './syncTestHelpers';

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

test('GET and PUT /settings require auth', async () => {
  const { app } = await setupTwoUsers();
  assert.equal((await app.inject({ method: 'GET', url: '/settings' })).statusCode, 401);
  assert.equal(
    (await app.inject({ method: 'PUT', url: '/settings', payload: { settings: {}, updatedAt: 't' } })).statusCode,
    401,
  );
});

test('GET /settings before anything is stored returns nulls', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const response = await app.inject({ method: 'GET', url: '/settings', headers: auth(aliceToken) });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { settings: null, updatedAt: null });
});

test('PUT then GET round-trips the settings blob verbatim', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const settings = { theme: 'dark', accessibility: { textSize: 'large', haptics: false }, bodyProfile: { heightCm: 180 } };

  const put = await app.inject({
    method: 'PUT', url: '/settings', headers: auth(aliceToken),
    payload: { settings, updatedAt: '2026-01-01T00:00:00.000Z' },
  });
  assert.equal(put.statusCode, 200);
  assert.deepEqual(put.json(), { settings, updatedAt: '2026-01-01T00:00:00.000Z' });

  const get = await app.inject({ method: 'GET', url: '/settings', headers: auth(aliceToken) });
  assert.deepEqual(get.json(), { settings, updatedAt: '2026-01-01T00:00:00.000Z' });
});

test('PUT is last-write-wins on updatedAt: an older write does not overwrite a newer one', async () => {
  const { app, aliceToken } = await setupTwoUsers();

  await app.inject({
    method: 'PUT', url: '/settings', headers: auth(aliceToken),
    payload: { settings: { theme: 'dark' }, updatedAt: '2026-06-01T00:00:00.000Z' },
  });

  // An older edit arrives late — must be ignored, and the response must
  // report the value that actually stayed stored.
  const stale = await app.inject({
    method: 'PUT', url: '/settings', headers: auth(aliceToken),
    payload: { settings: { theme: 'light' }, updatedAt: '2026-05-01T00:00:00.000Z' },
  });
  assert.equal(stale.statusCode, 200);
  assert.deepEqual(stale.json(), { settings: { theme: 'dark' }, updatedAt: '2026-06-01T00:00:00.000Z' });

  // A newer edit does win.
  const fresh = await app.inject({
    method: 'PUT', url: '/settings', headers: auth(aliceToken),
    payload: { settings: { theme: 'system' }, updatedAt: '2026-07-01T00:00:00.000Z' },
  });
  assert.deepEqual(fresh.json(), { settings: { theme: 'system' }, updatedAt: '2026-07-01T00:00:00.000Z' });
});

test('PUT rejects a non-object settings value or a missing updatedAt', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  for (const payload of [
    { settings: 'nope', updatedAt: 't' },
    { settings: [1, 2], updatedAt: 't' },
    { settings: null, updatedAt: 't' },
    { settings: {} },
  ]) {
    const response = await app.inject({ method: 'PUT', url: '/settings', headers: auth(aliceToken), payload });
    assert.equal(response.statusCode, 400, JSON.stringify(payload));
  }
});

test('one user\'s settings are never visible to or writable by another', async () => {
  const { app, aliceToken, bobToken } = await setupTwoUsers();

  await app.inject({
    method: 'PUT', url: '/settings', headers: auth(aliceToken),
    payload: { settings: { theme: 'dark' }, updatedAt: '2026-01-01T00:00:00.000Z' },
  });

  // Bob sees nothing of Alice's.
  const bobGet = await app.inject({ method: 'GET', url: '/settings', headers: auth(bobToken) });
  assert.deepEqual(bobGet.json(), { settings: null, updatedAt: null });

  // Bob writing his own, with a far-future timestamp, leaves Alice's alone.
  await app.inject({
    method: 'PUT', url: '/settings', headers: auth(bobToken),
    payload: { settings: { theme: 'light' }, updatedAt: '2099-01-01T00:00:00.000Z' },
  });
  const aliceGet = await app.inject({ method: 'GET', url: '/settings', headers: auth(aliceToken) });
  assert.deepEqual(aliceGet.json(), { settings: { theme: 'dark' }, updatedAt: '2026-01-01T00:00:00.000Z' });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers } from './syncTestHelpers';

const muscleGroup = (overrides: Record<string, unknown> = {}) => ({
  id: 'Obliques',
  name: 'Obliques',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

test('GET and POST /sync/muscleGroups require auth', async () => {
  const { app } = await setupTwoUsers();
  const get = await app.inject({ method: 'GET', url: '/sync/muscleGroups' });
  assert.equal(get.statusCode, 401);
});

test('a muscle group round-trips through push and pull', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({ method: 'POST', url: '/sync/muscleGroups', headers, payload: { muscleGroups: [muscleGroup()] } });
  const pull = await app.inject({ method: 'GET', url: '/sync/muscleGroups', headers });

  const stored = pull.json().muscleGroups[0];
  assert.equal(stored.id, 'Obliques');
  assert.equal(stored.name, 'Obliques');
});

test('renaming a muscle group keeps its id, so exercises referencing that id still resolve to the new name', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({ method: 'POST', url: '/sync/muscleGroups', headers, payload: { muscleGroups: [muscleGroup({ name: 'Side Abs' })] } });
  const renamed = await app.inject({
    method: 'POST', url: '/sync/muscleGroups', headers,
    payload: { muscleGroups: [muscleGroup({ name: 'Obliques', updatedAt: '2026-01-02T00:00:00.000Z' })] },
  });

  assert.equal(renamed.json().muscleGroups[0].id, 'Obliques');
  assert.equal(renamed.json().muscleGroups[0].name, 'Obliques');
});

test('a stale push loses to a newer row already stored', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({ method: 'POST', url: '/sync/muscleGroups', headers, payload: { muscleGroups: [muscleGroup({ name: 'Newer', updatedAt: '2026-02-01T00:00:00.000Z' })] } });
  const stale = await app.inject({
    method: 'POST', url: '/sync/muscleGroups', headers,
    payload: { muscleGroups: [muscleGroup({ name: 'Stale', updatedAt: '2026-01-01T00:00:00.000Z' })] },
  });

  assert.equal(stale.json().muscleGroups[0].name, 'Newer');
});

test('muscle groups never leak across users', async () => {
  const { app, aliceToken, bobToken } = await setupTwoUsers();

  await app.inject({ method: 'POST', url: '/sync/muscleGroups', headers: { authorization: `Bearer ${aliceToken}` }, payload: { muscleGroups: [muscleGroup()] } });

  const bobPull = await app.inject({ method: 'GET', url: '/sync/muscleGroups', headers: { authorization: `Bearer ${bobToken}` } });
  assert.deepEqual(bobPull.json().muscleGroups, []);
});

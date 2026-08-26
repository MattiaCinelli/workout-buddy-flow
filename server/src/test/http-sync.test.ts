import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers } from './syncTestHelpers';

const setup = setupTwoUsers;

const exercise = (overrides: Record<string, unknown> = {}) => ({
  id: 'ex-1',
  name: 'Squat',
  category: 'strength',
  muscleGroups: ['quads', 'glutes'],
  difficulty: 'beginner',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

test('GET /sync/exercises requires auth', async () => {
  const { app } = await setup();
  const response = await app.inject({ method: 'GET', url: '/sync/exercises' });
  assert.equal(response.statusCode, 401);
});

test('POST /sync/exercises requires auth', async () => {
  const { app } = await setup();
  const response = await app.inject({ method: 'POST', url: '/sync/exercises', payload: { exercises: [exercise()] } });
  assert.equal(response.statusCode, 401);
});

test('GET with nothing synced yet returns an empty list and a serverTime', async () => {
  const { app, aliceToken } = await setup();
  const response = await app.inject({
    method: 'GET', url: '/sync/exercises', headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.deepEqual(body.exercises, []);
  assert.equal(typeof body.serverTime, 'string');
});

test('a pushed exercise is returned by POST and shows up in a subsequent GET', async () => {
  const { app, aliceToken } = await setup();

  const push = await app.inject({
    method: 'POST', url: '/sync/exercises', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { exercises: [exercise()] },
  });
  assert.equal(push.statusCode, 200);
  assert.equal(push.json().exercises[0].name, 'Squat');

  const pull = await app.inject({
    method: 'GET', url: '/sync/exercises', headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(pull.json().exercises.length, 1);
  assert.equal(pull.json().exercises[0].id, 'ex-1');
});

test('instructions round-trips through push and pull', async () => {
  const { app, aliceToken } = await setup();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ instructions: 'Keep your back straight and drive through your heels.' })] },
  });
  const pull = await app.inject({ method: 'GET', url: '/sync/exercises', headers });

  assert.equal(pull.json().exercises[0].instructions, 'Keep your back straight and drive through your heels.');
});

test('secondsPerRep round-trips through push and pull', async () => {
  const { app, aliceToken } = await setup();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ secondsPerRep: 4 })] },
  });
  const pull = await app.inject({ method: 'GET', url: '/sync/exercises', headers });

  assert.equal(pull.json().exercises[0].secondsPerRep, 4);
});

test('logType and set defaults round-trip through push and pull', async () => {
  const { app, aliceToken } = await setup();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ logType: 'time', defaultSets: 3, defaultDuration: 45 })] },
  });
  const pull = await app.inject({ method: 'GET', url: '/sync/exercises', headers });

  const stored = pull.json().exercises[0];
  assert.equal(stored.logType, 'time');
  assert.equal(stored.defaultSets, 3);
  assert.equal(stored.defaultDuration, 45);
  assert.equal(stored.defaultReps, undefined);
});

test('GET since a watermark only returns rows the server received after it', async () => {
  const { app, aliceToken } = await setup();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ id: 'ex-1' })] },
  });
  const watermarkResponse = await app.inject({ method: 'GET', url: '/sync/exercises', headers });
  const watermark = watermarkResponse.json().serverTime;
  await new Promise(resolve => setTimeout(resolve, 5)); // ensure a distinct millisecond from the watermark

  await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ id: 'ex-2' })] },
  });

  const response = await app.inject({
    method: 'GET', url: `/sync/exercises?since=${encodeURIComponent(watermark)}`, headers,
  });
  assert.deepEqual(response.json().exercises.map((e: { id: string }) => e.id), ['ex-2']);
});

test('a pushed record shows up even if its updatedAt predates another device\'s watermark', async () => {
  // The bug found in real usage: device A creates a workout locally at T1
  // but doesn't push until T3; device B syncs (capturing a watermark) at
  // T2, in between. B's next pull must still receive A's workout — it
  // reached the server after B's watermark, even though the client-stamped
  // updatedAt on the record itself is far earlier.
  const { app, aliceToken } = await setup();
  const headers = { authorization: `Bearer ${aliceToken}` };

  const deviceBWatermarkResponse = await app.inject({ method: 'GET', url: '/sync/exercises', headers });
  const deviceBWatermark = deviceBWatermarkResponse.json().serverTime;
  await new Promise(resolve => setTimeout(resolve, 5)); // ensure a distinct millisecond from the watermark

  await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ id: 'ex-late-push', updatedAt: '2020-01-01T00:00:00.000Z' })] },
  });

  const devicePull = await app.inject({
    method: 'GET', url: `/sync/exercises?since=${encodeURIComponent(deviceBWatermark)}`, headers,
  });
  assert.deepEqual(devicePull.json().exercises.map((e: { id: string }) => e.id), ['ex-late-push']);
});

test('a stale push loses to a newer row already stored (last-write-wins over HTTP)', async () => {
  const { app, aliceToken } = await setup();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ name: 'Squat v2', updatedAt: '2026-01-02T00:00:00.000Z' })] },
  });
  const stalePush = await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ name: 'Squat v1 (stale)', updatedAt: '2026-01-01T00:00:00.000Z' })] },
  });

  // The response tells the caller what actually won, not what it sent.
  assert.equal(stalePush.json().exercises[0].name, 'Squat v2');
});

test('one user can never see or overwrite another user\'s exercises', async () => {
  const { app, aliceToken, bobToken } = await setup();

  await app.inject({
    method: 'POST', url: '/sync/exercises', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { exercises: [exercise({ id: 'shared-id', name: "Alice's exercise" })] },
  });
  await app.inject({
    method: 'POST', url: '/sync/exercises', headers: { authorization: `Bearer ${bobToken}` },
    payload: { exercises: [exercise({ id: 'shared-id', name: "Bob's exercise", updatedAt: '2026-01-05T00:00:00.000Z' })] },
  });

  const aliceView = await app.inject({
    method: 'GET', url: '/sync/exercises', headers: { authorization: `Bearer ${aliceToken}` },
  });
  const bobView = await app.inject({
    method: 'GET', url: '/sync/exercises', headers: { authorization: `Bearer ${bobToken}` },
  });

  assert.equal(aliceView.json().exercises.length, 1);
  assert.equal(aliceView.json().exercises[0].name, "Alice's exercise");
  assert.equal(bobView.json().exercises.length, 1);
  assert.equal(bobView.json().exercises[0].name, "Bob's exercise");
});

test('a soft-deleted exercise is included in the next pull with deletedAt set', async () => {
  const { app, aliceToken } = await setup();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ updatedAt: '2026-01-01T00:00:00.000Z' })] },
  });
  await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [exercise({ updatedAt: '2026-01-02T00:00:00.000Z', deletedAt: '2026-01-02T00:00:00.000Z' })] },
  });

  const response = await app.inject({
    method: 'GET', url: '/sync/exercises?since=2026-01-01T00:00:00.000Z', headers,
  });
  assert.equal(response.json().exercises[0].deletedAt, '2026-01-02T00:00:00.000Z');
});

test('a push missing required fields is rejected with 400, not stored', async () => {
  const { app, aliceToken } = await setup();
  const headers = { authorization: `Bearer ${aliceToken}` };

  const response = await app.inject({
    method: 'POST', url: '/sync/exercises', headers,
    payload: { exercises: [{ id: 'ex-1', name: 'Missing everything else' }] },
  });
  assert.equal(response.statusCode, 400);

  const pull = await app.inject({ method: 'GET', url: '/sync/exercises', headers });
  assert.deepEqual(pull.json().exercises, []);
});

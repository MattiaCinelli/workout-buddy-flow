import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers } from './syncTestHelpers';

const session = (overrides: Record<string, unknown> = {}) => ({
  id: 's-1',
  workoutId: 'w-1',
  date: '2026-01-05',
  title: 'Leg day',
  duration: 42,
  category: 'strength',
  sets: [{ exerciseId: 'squat', reps: 8, weight: 100 }],
  completedAt: '2026-01-05T10:30:00.000Z',
  plannedDuration: 45,
  actualSets: [
    { exerciseId: 'squat', setIndex: 0, completed: true, reps: 8, weight: 100 },
    { exerciseId: 'squat', setIndex: 1, completed: false },
  ],
  perceivedExertion: 7,
  updatedAt: '2026-01-05T10:30:00.000Z',
  ...overrides,
});

test('GET and POST /sync/workoutSessions require auth', async () => {
  const { app } = await setupTwoUsers();
  const get = await app.inject({ method: 'GET', url: '/sync/workoutSessions' });
  assert.equal(get.statusCode, 401);
});

test('a session round-trips including skipped sets in actualSets', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({ method: 'POST', url: '/sync/workoutSessions', headers, payload: { workoutSessions: [session()] } });
  const pull = await app.inject({ method: 'GET', url: '/sync/workoutSessions', headers });

  const stored = pull.json().workoutSessions[0];
  assert.equal(stored.actualSets.length, 2);
  assert.equal(stored.actualSets[1].completed, false);
  assert.equal(stored.perceivedExertion, 7);
});

test('a session with no actualSets round-trips without it (optional field, not required)', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  const minimal = session({ actualSets: undefined, perceivedExertion: undefined });
  delete (minimal as Record<string, unknown>).actualSets;
  delete (minimal as Record<string, unknown>).perceivedExertion;

  const push = await app.inject({ method: 'POST', url: '/sync/workoutSessions', headers, payload: { workoutSessions: [minimal] } });
  assert.equal(push.statusCode, 200);
  assert.equal(push.json().workoutSessions[0].actualSets, undefined);
});

test('sessions never leak across users', async () => {
  const { app, aliceToken, bobToken } = await setupTwoUsers();

  await app.inject({ method: 'POST', url: '/sync/workoutSessions', headers: { authorization: `Bearer ${aliceToken}` }, payload: { workoutSessions: [session()] } });

  const bobPull = await app.inject({ method: 'GET', url: '/sync/workoutSessions', headers: { authorization: `Bearer ${bobToken}` } });
  assert.deepEqual(bobPull.json().workoutSessions, []);
});

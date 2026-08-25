import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers } from './syncTestHelpers';

const workout = (overrides: Record<string, unknown> = {}) => ({
  id: 'w-1',
  date: '2026-01-01',
  title: 'Leg day',
  duration: 45,
  category: 'strength',
  sets: [
    { exerciseId: 'squat', reps: 8, weight: 100, restAfter: 90 },
    { exerciseId: 'squat', reps: 8, weight: 100, restAfter: 90 },
    { exerciseId: 'lunge', reps: 12 },
  ],
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

test('GET and POST /sync/workouts require auth', async () => {
  const { app } = await setupTwoUsers();
  const get = await app.inject({ method: 'GET', url: '/sync/workouts' });
  const post = await app.inject({ method: 'POST', url: '/sync/workouts', payload: { workouts: [workout()] } });
  assert.equal(get.statusCode, 401);
  assert.equal(post.statusCode, 401);
});

test('a workout with multiple sets round-trips through push and pull with set order preserved', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  const push = await app.inject({ method: 'POST', url: '/sync/workouts', headers, payload: { workouts: [workout()] } });
  assert.equal(push.statusCode, 200);

  const pull = await app.inject({ method: 'GET', url: '/sync/workouts', headers });
  const stored = pull.json().workouts[0];
  // Order matters here: it's how the app tells apart 3 sets of the same
  // exercise from 3 separate exercises with one set each. JSON.stringify
  // preserves array order, but this proves it end to end through SQLite.
  assert.deepEqual(stored.sets.map((s: { exerciseId: string }) => s.exerciseId), ['squat', 'squat', 'lunge']);
  assert.equal(stored.sets[0].weight, 100);
});

test('a stale workout push loses to a newer one already stored', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({ method: 'POST', url: '/sync/workouts', headers, payload: { workouts: [workout({ title: 'v2', updatedAt: '2026-01-02T00:00:00.000Z' })] } });
  const stale = await app.inject({ method: 'POST', url: '/sync/workouts', headers, payload: { workouts: [workout({ title: 'v1 (stale)', updatedAt: '2026-01-01T00:00:00.000Z' })] } });

  assert.equal(stale.json().workouts[0].title, 'v2');
});

test('workouts never leak across users', async () => {
  const { app, aliceToken, bobToken } = await setupTwoUsers();

  await app.inject({ method: 'POST', url: '/sync/workouts', headers: { authorization: `Bearer ${aliceToken}` }, payload: { workouts: [workout({ title: "Alice's" })] } });

  const bobPull = await app.inject({ method: 'GET', url: '/sync/workouts', headers: { authorization: `Bearer ${bobToken}` } });
  assert.deepEqual(bobPull.json().workouts, []);
});

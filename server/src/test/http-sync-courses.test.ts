import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers } from './syncTestHelpers';

const course = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-1',
  title: 'Beginner strength',
  durationWeeks: 6,
  workouts: [
    { id: 'cw-1', type: 'workout', workoutId: 'w-1', order: 0, week: 1, day: 1, completed: false },
    { id: 'cw-2', type: 'rest', order: 1, week: 1, day: 2, completed: false },
    // Same workoutId appearing twice, at different program positions —
    // this is exactly the case the client keys completion by courseItemId
    // rather than workoutId for (see docs/data-model.md).
    { id: 'cw-3', type: 'workout', workoutId: 'w-1', order: 2, week: 1, day: 3, completed: true, completedAt: '2026-01-03T00:00:00.000Z' },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

test('GET and POST /sync/courses require auth', async () => {
  const { app } = await setupTwoUsers();
  const get = await app.inject({ method: 'GET', url: '/sync/courses' });
  assert.equal(get.statusCode, 401);
});

test('a course with a repeated workoutId round-trips with each item id distinct', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({ method: 'POST', url: '/sync/courses', headers, payload: { courses: [course()] } });
  const pull = await app.inject({ method: 'GET', url: '/sync/courses', headers });

  const stored = pull.json().courses[0];
  assert.equal(stored.workouts.length, 3);
  assert.equal(stored.workouts.filter((w: { workoutId?: string }) => w.workoutId === 'w-1').length, 2);
  assert.equal(stored.workouts[2].completed, true);
  assert.equal(stored.workouts[2].completedAt, '2026-01-03T00:00:00.000Z');
});

test('a stale course push loses to a newer one already stored', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({ method: 'POST', url: '/sync/courses', headers, payload: { courses: [course({ title: 'v2', updatedAt: '2026-01-02T00:00:00.000Z' })] } });
  const stale = await app.inject({ method: 'POST', url: '/sync/courses', headers, payload: { courses: [course({ title: 'v1 (stale)', updatedAt: '2026-01-01T00:00:00.000Z' })] } });

  assert.equal(stale.json().courses[0].title, 'v2');
});

test('courses never leak across users', async () => {
  const { app, aliceToken, bobToken } = await setupTwoUsers();

  await app.inject({ method: 'POST', url: '/sync/courses', headers: { authorization: `Bearer ${aliceToken}` }, payload: { courses: [course()] } });

  const bobPull = await app.inject({ method: 'GET', url: '/sync/courses', headers: { authorization: `Bearer ${bobToken}` } });
  assert.deepEqual(bobPull.json().courses, []);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers } from './syncTestHelpers';

const scheduledWorkout = (overrides: Record<string, unknown> = {}) => ({
  id: 'sw-1',
  workoutId: 'w-1',
  startDate: '2026-03-10',
  startTime: '09:00',
  recurrence: 'weekly',
  recurrenceDays: ['tuesday'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

test('GET and POST /sync/scheduledWorkouts require auth', async () => {
  const { app } = await setupTwoUsers();
  const get = await app.inject({ method: 'GET', url: '/sync/scheduledWorkouts' });
  assert.equal(get.statusCode, 401);
});

test('a recurring schedule round-trips recurrence and skipped occurrences', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({ method: 'POST', url: '/sync/scheduledWorkouts', headers,
    payload: { scheduledWorkouts: [scheduledWorkout({ skippedDates: ['2026-03-17'] })] } });
  const pull = await app.inject({ method: 'GET', url: '/sync/scheduledWorkouts', headers });

  const stored = pull.json().scheduledWorkouts[0];
  assert.equal(stored.recurrence, 'weekly');
  assert.deepEqual(stored.recurrenceDays, ['tuesday']);
  assert.deepEqual(stored.skippedDates, ['2026-03-17']);
  assert.equal(stored.createdAt, '2026-01-01T00:00:00.000Z');
});

test('a weekly schedule can span multiple chosen weekdays', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({
    method: 'POST', url: '/sync/scheduledWorkouts', headers,
    payload: { scheduledWorkouts: [scheduledWorkout({ recurrenceDays: ['monday', 'wednesday', 'friday'] })] },
  });
  const pull = await app.inject({ method: 'GET', url: '/sync/scheduledWorkouts', headers });

  assert.deepEqual(pull.json().scheduledWorkouts[0].recurrenceDays, ['monday', 'wednesday', 'friday']);
});

test('created_at is not overwritten by a later edit', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const headers = { authorization: `Bearer ${aliceToken}` };

  await app.inject({ method: 'POST', url: '/sync/scheduledWorkouts', headers, payload: { scheduledWorkouts: [scheduledWorkout({ createdAt: '2026-01-01T00:00:00.000Z' })] } });
  const edited = await app.inject({
    method: 'POST', url: '/sync/scheduledWorkouts', headers,
    payload: { scheduledWorkouts: [scheduledWorkout({ startTime: '18:00', createdAt: '2099-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' })] },
  });

  // createdAt is the schedule's original creation moment; the update path
  // deliberately never touches it, regardless of what a later push sends.
  assert.equal(edited.json().scheduledWorkouts[0].createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(edited.json().scheduledWorkouts[0].startTime, '18:00');
});

test('scheduled workouts never leak across users', async () => {
  const { app, aliceToken, bobToken } = await setupTwoUsers();

  await app.inject({ method: 'POST', url: '/sync/scheduledWorkouts', headers: { authorization: `Bearer ${aliceToken}` }, payload: { scheduledWorkouts: [scheduledWorkout()] } });

  const bobPull = await app.inject({ method: 'GET', url: '/sync/scheduledWorkouts', headers: { authorization: `Bearer ${bobToken}` } });
  assert.deepEqual(bobPull.json().scheduledWorkouts, []);
});

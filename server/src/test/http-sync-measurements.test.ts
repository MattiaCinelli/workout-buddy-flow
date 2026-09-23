import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers, PASSWORD } from './syncTestHelpers';

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-1', measurementId: 'toe-touch', name: 'Toe touch', description: 'Fingertips to toes, seated',
  kind: 'length', better: 'lower', value: 12.5, date: '2026-09-01', notes: 'after warm-up',
  updatedAt: '2026-09-01T10:00:00.000Z', ...overrides,
});

const push = (app: Awaited<ReturnType<typeof setupTwoUsers>>['app'], token: string, measurements: unknown[]) =>
  app.inject({ method: 'POST', url: '/sync/measurements', headers: { authorization: `Bearer ${token}` }, payload: { measurements } });
const pull = (app: Awaited<ReturnType<typeof setupTwoUsers>>['app'], token: string, query = '') =>
  app.inject({ method: 'GET', url: `/sync/measurements${query}`, headers: { authorization: `Bearer ${token}` } });

test('GET and POST /sync/measurements require auth', async () => {
  const { app } = await setupTwoUsers();
  assert.equal((await app.inject({ method: 'GET', url: '/sync/measurements' })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/sync/measurements', payload: { measurements: [] } })).statusCode, 401);
});

test('a measurement entry round-trips through push and pull, including a negative length', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const pushed = await push(app, aliceToken, [entry(), entry({ id: 'entry-2', value: -3, date: '2026-09-15', updatedAt: '2026-09-15T10:00:00.000Z' })]);
  assert.equal(pushed.statusCode, 200);

  const pulled = (await pull(app, aliceToken)).json().measurements as Array<Record<string, unknown>>;
  assert.equal(pulled.length, 2);
  assert.deepEqual(pulled.find(item => item.id === 'entry-1'), entry());
  assert.equal(pulled.find(item => item.id === 'entry-2')?.value, -3);
});

test('optional fields can be omitted', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const minimal = { id: 'm', measurementId: 'g', name: 'Plank', kind: 'time', better: 'higher', value: 95, date: '2026-09-01', updatedAt: '2026-09-01T10:00:00.000Z' };
  assert.equal((await push(app, aliceToken, [minimal])).statusCode, 200);
  assert.deepEqual((await pull(app, aliceToken)).json().measurements, [minimal]);
});

test('invalid measurements are rejected with 400 and not stored', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const bad: Array<[string, Record<string, unknown>]> = [
    ['unknown kind', { kind: 'colour' }],
    ['unknown direction', { better: 'sideways' }],
    ['non-numeric value', { value: 'lots' }],
    ['empty name', { name: '' }],
    ['over-long name', { name: 'x'.repeat(101) }],
    ['over-long description', { description: 'x'.repeat(2001) }],
    ['missing measurementId', { measurementId: undefined }],
  ];
  for (const [label, overrides] of bad) {
    const response = await push(app, aliceToken, [entry(overrides)]);
    assert.equal(response.statusCode, 400, label);
  }
  assert.deepEqual((await pull(app, aliceToken)).json().measurements, []);
});

test('a stale push loses to a newer entry already stored (last-write-wins)', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  await push(app, aliceToken, [entry({ value: 10, updatedAt: '2026-09-02T00:00:00.000Z' })]);
  const stale = await push(app, aliceToken, [entry({ value: 99, updatedAt: '2026-09-01T00:00:00.000Z' })]);
  assert.equal(stale.json().measurements[0].value, 10);
});

test('a soft-deleted entry comes back with deletedAt so other devices remove it', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  await push(app, aliceToken, [entry()]);
  await push(app, aliceToken, [entry({ updatedAt: '2026-09-03T00:00:00.000Z', deletedAt: '2026-09-03T00:00:00.000Z' })]);
  const [item] = (await pull(app, aliceToken)).json().measurements;
  assert.equal(item.deletedAt, '2026-09-03T00:00:00.000Z');
});

test('measurements never leak across users', async () => {
  const { app, aliceToken, bobToken } = await setupTwoUsers();
  await push(app, aliceToken, [entry()]);
  assert.deepEqual((await pull(app, bobToken)).json().measurements, []);

  // Same id pushed by Bob lands in his own namespace and leaves Alice's alone.
  await push(app, bobToken, [entry({ value: 77, updatedAt: '2026-10-01T00:00:00.000Z' })]);
  assert.equal((await pull(app, aliceToken)).json().measurements[0].value, 12.5);
  assert.equal((await pull(app, bobToken)).json().measurements[0].value, 77);
});

test('deleting the account removes its measurements', async () => {
  const { app, aliceToken, alice } = await setupTwoUsers();
  await push(app, aliceToken, [entry()]);
  const count = () => (app.db.prepare('SELECT COUNT(*) AS n FROM measurements WHERE user_id = ?').get(alice.id) as { n: number }).n;
  assert.equal(count(), 1);

  const response = await app.inject({
    method: 'DELETE', url: '/account', headers: { authorization: `Bearer ${aliceToken}` }, payload: { currentPassword: PASSWORD },
  });
  assert.equal(response.statusCode, 204);
  assert.equal(count(), 0);
});

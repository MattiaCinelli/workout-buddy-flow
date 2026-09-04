import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db';
import { createUser, getUserByEmail, getUserById } from '../db/users';
import { createSession, getValidSession, deleteSession } from '../db/sessions';
import { listChangedSince, upsertExercise, SyncedExercise } from '../db/exercises';

const freshDb = () => openDb(':memory:');

test('users: create and look up by email and id', () => {
  const db = freshDb();
  const user = createUser(db, 'you@example.com', 'hashed-password');

  assert.equal(getUserByEmail(db, 'you@example.com')?.id, user.id);
  assert.equal(getUserById(db, user.id)?.email, 'you@example.com');
  assert.equal(getUserByEmail(db, 'nobody@example.com'), undefined);
});

test('sessions: valid until deleted, invalid once deleted', () => {
  const db = freshDb();
  const user = createUser(db, 'you@example.com', 'hashed-password');
  const session = createSession(db, user.id);

  assert.equal(getValidSession(db, session.token)?.userId, user.id);
  deleteSession(db, session.token);
  assert.equal(getValidSession(db, session.token), undefined);
});

const exercise = (overrides: Partial<SyncedExercise> = {}): SyncedExercise => ({
  id: 'ex-1',
  name: 'Squat',
  category: 'strength',
  muscleGroups: ['quads', 'glutes'],
  difficulty: 'beginner',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

test('exercises: upsert inserts a new row', () => {
  const db = freshDb();
  const user = createUser(db, 'you@example.com', 'hash');

  const stored = upsertExercise(db, user.id, exercise());
  assert.equal(stored.name, 'Squat');
  assert.deepEqual(listChangedSince(db, user.id).map(e => e.id), ['ex-1']);
});

test('exercises: directional defaults survive a database round trip', () => {
  const db = freshDb();
  const user = createUser(db, 'you@example.com', 'hash');

  const stored = upsertExercise(db, user.id, exercise({
    unilateral: true,
    executionDirections: ['left', 'right', 'forward', 'backward'],
  }));

  assert.equal(stored.unilateral, true);
  assert.deepEqual(stored.executionDirections, ['left', 'right', 'forward', 'backward']);
  assert.equal(listChangedSince(db, user.id)[0].unilateral, true);
  assert.deepEqual(listChangedSince(db, user.id)[0].executionDirections, ['left', 'right', 'forward', 'backward']);
});

test('exercises: an older write loses to a newer one already stored (last-write-wins)', () => {
  const db = freshDb();
  const user = createUser(db, 'you@example.com', 'hash');

  upsertExercise(db, user.id, exercise({ name: 'Squat v2', updatedAt: '2026-01-02T00:00:00.000Z' }));
  const result = upsertExercise(db, user.id, exercise({ name: 'Squat v1 (stale)', updatedAt: '2026-01-01T00:00:00.000Z' }));

  // The stale write is rejected; the caller learns this by getting back v2, not what it sent.
  assert.equal(result.name, 'Squat v2');
});

test('exercises: a newer write overwrites an older one', () => {
  const db = freshDb();
  const user = createUser(db, 'you@example.com', 'hash');

  upsertExercise(db, user.id, exercise({ name: 'Squat v1', updatedAt: '2026-01-01T00:00:00.000Z' }));
  const result = upsertExercise(db, user.id, exercise({ name: 'Squat v2', updatedAt: '2026-01-02T00:00:00.000Z' }));

  assert.equal(result.name, 'Squat v2');
});

test('exercises: listChangedSince only returns rows written to the server after the watermark', async () => {
  const db = freshDb();
  const user = createUser(db, 'you@example.com', 'hash');

  upsertExercise(db, user.id, exercise({ id: 'ex-1' }));
  const watermark = new Date().toISOString();
  await new Promise(resolve => setTimeout(resolve, 5));
  upsertExercise(db, user.id, exercise({ id: 'ex-2' }));

  const changed = listChangedSince(db, user.id, watermark);
  assert.deepEqual(changed.map(e => e.id), ['ex-2']);
});

test('exercises: a record shows up even if its updatedAt predates the watermark (real bug this fixes)', async () => {
  // Reproduces exactly what broke in real usage: device A edits a record
  // at some point, but doesn't push it to the server until later. Device B
  // syncs (and captures its watermark) in between. B's next pull must
  // still see A's record — it arrived on the server after B's watermark,
  // even though its updatedAt is far earlier. Filtering by updatedAt
  // instead of synced_at silently and permanently hid it.
  const db = freshDb();
  const user = createUser(db, 'you@example.com', 'hash');

  const deviceBWatermark = new Date().toISOString();
  await new Promise(resolve => setTimeout(resolve, 5));
  upsertExercise(db, user.id, exercise({ id: 'ex-late-push', updatedAt: '2020-01-01T00:00:00.000Z' }));

  const changed = listChangedSince(db, user.id, deviceBWatermark);
  assert.deepEqual(changed.map(e => e.id), ['ex-late-push']);
});

test('exercises: a soft delete is a normal upsert and shows up as changed', () => {
  const db = freshDb();
  const user = createUser(db, 'you@example.com', 'hash');

  upsertExercise(db, user.id, exercise({ updatedAt: '2026-01-01T00:00:00.000Z' }));
  const deleted = upsertExercise(db, user.id, exercise({
    updatedAt: '2026-01-02T00:00:00.000Z',
    deletedAt: '2026-01-02T00:00:00.000Z',
  }));

  assert.equal(deleted.deletedAt, '2026-01-02T00:00:00.000Z');
  assert.deepEqual(listChangedSince(db, user.id, '2026-01-01T00:00:00.000Z').map(e => e.id), ['ex-1']);
});

test('exercises: rows never leak across users, even with a colliding id', () => {
  const db = freshDb();
  const alice = createUser(db, 'alice@example.com', 'hash');
  const bob = createUser(db, 'bob@example.com', 'hash');

  // Same id, two different owners: each write must succeed independently
  // rather than one silently clobbering (or being blocked by) the other.
  upsertExercise(db, alice.id, exercise({ id: 'shared-id', name: "Alice's exercise" }));
  upsertExercise(db, bob.id, exercise({ id: 'shared-id', name: "Bob's exercise", updatedAt: '2026-01-05T00:00:00.000Z' }));

  assert.equal(listChangedSince(db, alice.id).find(e => e.id === 'shared-id')?.name, "Alice's exercise");
  assert.equal(listChangedSince(db, bob.id).find(e => e.id === 'shared-id')?.name, "Bob's exercise");

  // And Alice's list must never include Bob's row at all, not even filtered out by name.
  assert.equal(listChangedSince(db, alice.id).length, 1);
  assert.equal(listChangedSince(db, bob.id).length, 1);
});

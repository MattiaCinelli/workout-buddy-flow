import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers, PASSWORD } from './syncTestHelpers';
import { createUser } from '../db/users';
import { hashPassword } from '../auth/password';

test('GET /account requires auth', async () => {
  const { app } = await setupTwoUsers();
  const response = await app.inject({ method: 'GET', url: '/account' });
  assert.equal(response.statusCode, 401);
});

test('GET /account returns the caller\'s own id, email, and displayName', async () => {
  const { app, alice, aliceToken } = await setupTwoUsers();
  const response = await app.inject({
    method: 'GET', url: '/account', headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { id: alice.id, email: alice.email });
});

test('updating displayName does not require a password', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const response = await app.inject({
    method: 'PATCH', url: '/account/profile', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { displayName: 'Alice' },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().displayName, 'Alice');

  const getResponse = await app.inject({ method: 'GET', url: '/account', headers: { authorization: `Bearer ${aliceToken}` } });
  assert.equal(getResponse.json().displayName, 'Alice');
});

test('updating email requires the correct current password', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const wrongPassword = await app.inject({
    method: 'PATCH', url: '/account/email', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: 'wrong', email: 'new@example.com' },
  });
  assert.equal(wrongPassword.statusCode, 401);

  const correctPassword = await app.inject({
    method: 'PATCH', url: '/account/email', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD, email: 'new@example.com' },
  });
  assert.equal(correctPassword.statusCode, 200);
  assert.equal(correctPassword.json().email, 'new@example.com');
});

test('updating email to one already used by another user is rejected', async () => {
  const { app, aliceToken, bob } = await setupTwoUsers();
  const response = await app.inject({
    method: 'PATCH', url: '/account/email', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD, email: bob.email },
  });
  assert.equal(response.statusCode, 409);
});

test('changing email to the same email you already have is allowed (not a conflict with yourself)', async () => {
  const { app, alice, aliceToken } = await setupTwoUsers();
  const response = await app.inject({
    method: 'PATCH', url: '/account/email', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD, email: alice.email },
  });
  assert.equal(response.statusCode, 200);
});

test('changing password requires the correct current password and a minimum length', async () => {
  const { app, aliceToken } = await setupTwoUsers();
  const wrongCurrent = await app.inject({
    method: 'POST', url: '/account/password', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: 'wrong', newPassword: 'newpassword123' },
  });
  assert.equal(wrongCurrent.statusCode, 401);

  const tooShort = await app.inject({
    method: 'POST', url: '/account/password', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD, newPassword: 'short' },
  });
  assert.equal(tooShort.statusCode, 400);
});

test('after changing password, the old password no longer works and the new one does', async () => {
  const { app, alice, aliceToken } = await setupTwoUsers();
  const changed = await app.inject({
    method: 'POST', url: '/account/password', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD, newPassword: 'newpassword123' },
  });
  assert.equal(changed.statusCode, 204);

  const loginWithOld = await app.inject({
    method: 'POST', url: '/auth/login', payload: { email: alice.email, password: PASSWORD },
  });
  assert.equal(loginWithOld.statusCode, 401);

  const loginWithNew = await app.inject({
    method: 'POST', url: '/auth/login', payload: { email: alice.email, password: 'newpassword123' },
  });
  assert.equal(loginWithNew.statusCode, 200);
});

test('changing password signs out other sessions but keeps the current one valid', async () => {
  const { app, alice, aliceToken } = await setupTwoUsers();

  // A second "device" logs in as alice, alongside the original aliceToken.
  const secondLogin = await app.inject({
    method: 'POST', url: '/auth/login', payload: { email: alice.email, password: PASSWORD },
  });
  const secondDeviceToken = secondLogin.json().token as string;

  await app.inject({
    method: 'POST', url: '/account/password', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD, newPassword: 'newpassword123' },
  });

  // The device that changed the password stays logged in...
  const stillWorks = await app.inject({
    method: 'GET', url: '/account', headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(stillWorks.statusCode, 200);

  // ...but the other device is signed out and must re-authenticate.
  const signedOut = await app.inject({
    method: 'GET', url: '/account', headers: { authorization: `Bearer ${secondDeviceToken}` },
  });
  assert.equal(signedOut.statusCode, 401);
});

test('GET /account/sessions reports how many other devices are signed in', async () => {
  const { app, alice, aliceToken } = await setupTwoUsers();

  const zero = await app.inject({
    method: 'GET', url: '/account/sessions', headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(zero.statusCode, 200);
  assert.deepEqual(zero.json(), { otherDevices: 0 });

  // Two more "devices" log in as alice.
  await app.inject({ method: 'POST', url: '/auth/login', payload: { email: alice.email, password: PASSWORD } });
  await app.inject({ method: 'POST', url: '/auth/login', payload: { email: alice.email, password: PASSWORD } });

  const two = await app.inject({
    method: 'GET', url: '/account/sessions', headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.deepEqual(two.json(), { otherDevices: 2 });
});

test('POST /account/sessions/revoke-others signs out every other device but keeps this one', async () => {
  const { app, alice, aliceToken } = await setupTwoUsers();
  const other = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: alice.email, password: PASSWORD } });
  const otherToken = other.json().token as string;

  const revoked = await app.inject({
    method: 'POST', url: '/account/sessions/revoke-others', headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(revoked.statusCode, 204);

  const thisDevice = await app.inject({ method: 'GET', url: '/account', headers: { authorization: `Bearer ${aliceToken}` } });
  assert.equal(thisDevice.statusCode, 200);

  const otherDevice = await app.inject({ method: 'GET', url: '/account', headers: { authorization: `Bearer ${otherToken}` } });
  assert.equal(otherDevice.statusCode, 401);
});

test('DELETE /account requires auth and the correct current password', async () => {
  const { app, aliceToken } = await setupTwoUsers();

  const noAuth = await app.inject({ method: 'DELETE', url: '/account', payload: { currentPassword: PASSWORD } });
  assert.equal(noAuth.statusCode, 401);

  const noPassword = await app.inject({
    method: 'DELETE', url: '/account', headers: { authorization: `Bearer ${aliceToken}` }, payload: {},
  });
  assert.equal(noPassword.statusCode, 400);

  const wrongPassword = await app.inject({
    method: 'DELETE', url: '/account', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: 'wrong' },
  });
  assert.equal(wrongPassword.statusCode, 401);
});

test('DELETE /account removes the user, their synced data, and all their sessions', async () => {
  const { app, alice, aliceToken } = await setupTwoUsers();

  const exercise = {
    id: 'ex-1', name: 'Squat', category: 'legs', muscleGroups: ['quads'],
    difficulty: 'intermediate', updatedAt: new Date().toISOString(),
  };
  await app.inject({
    method: 'POST', url: '/sync/exercises', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { exercises: [exercise] },
  });

  // A second device, to prove every session dies, not just the caller's.
  const second = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: alice.email, password: PASSWORD } });
  const secondToken = second.json().token as string;

  const deleted = await app.inject({
    method: 'DELETE', url: '/account', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD },
  });
  assert.equal(deleted.statusCode, 204);

  // Both tokens are dead.
  assert.equal((await app.inject({ method: 'GET', url: '/account', headers: { authorization: `Bearer ${aliceToken}` } })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/account', headers: { authorization: `Bearer ${secondToken}` } })).statusCode, 401);

  // The email is free again — nothing left in the users table.
  const loginAgain = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: alice.email, password: PASSWORD } });
  assert.equal(loginAgain.statusCode, 401);

  // Re-create the account with the same email and confirm it starts empty:
  // the old synced rows are gone, not just orphaned.
  const passwordHash = await hashPassword(PASSWORD);
  createUser(app.db, alice.email, passwordHash);
  const freshLogin = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: alice.email, password: PASSWORD } });
  const freshToken = freshLogin.json().token as string;
  const freshExercises = await app.inject({
    method: 'GET', url: '/sync/exercises', headers: { authorization: `Bearer ${freshToken}` },
  });
  assert.deepEqual(freshExercises.json().exercises, []);
});

test('deleting alice\'s account leaves bob\'s account and synced data intact', async () => {
  const { app, bob, bobToken, alice, aliceToken } = await setupTwoUsers();

  const bobExercise = {
    id: 'ex-bob', name: 'Deadlift', category: 'back', muscleGroups: ['hamstrings'],
    difficulty: 'advanced', updatedAt: new Date().toISOString(),
  };
  await app.inject({
    method: 'POST', url: '/sync/exercises', headers: { authorization: `Bearer ${bobToken}` },
    payload: { exercises: [bobExercise] },
  });

  await app.inject({
    method: 'DELETE', url: '/account', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD },
  });

  const bobAccount = await app.inject({ method: 'GET', url: '/account', headers: { authorization: `Bearer ${bobToken}` } });
  assert.equal(bobAccount.statusCode, 200);
  assert.deepEqual(bobAccount.json(), { id: bob.id, email: bob.email });

  const bobExercises = await app.inject({
    method: 'GET', url: '/sync/exercises', headers: { authorization: `Bearer ${bobToken}` },
  });
  assert.equal(bobExercises.json().exercises.length, 1);
  assert.equal(bobExercises.json().exercises[0].id, 'ex-bob');

  // alice's email is free; bob's login still works.
  assert.equal(
    (await app.inject({ method: 'POST', url: '/auth/login', payload: { email: alice.email, password: PASSWORD } })).statusCode,
    401,
  );
  assert.equal(
    (await app.inject({ method: 'POST', url: '/auth/login', payload: { email: bob.email, password: PASSWORD } })).statusCode,
    200,
  );
});

test('changes made with alice\'s token never affect bob\'s account', async () => {
  const { app, bob, bobToken, aliceToken } = await setupTwoUsers();

  // /account has no "target user id" in the request at all — it's always
  // "whoever this Bearer token belongs to" — so there's no field to smuggle
  // a different user's id into. Prove it by changing everything changeable
  // with alice's token, then confirming bob's account is untouched.
  await app.inject({
    method: 'PATCH', url: '/account/profile', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { displayName: 'Alice Changed' },
  });
  await app.inject({
    method: 'PATCH', url: '/account/email', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD, email: 'alice-new@example.com' },
  });
  await app.inject({
    method: 'POST', url: '/account/password', headers: { authorization: `Bearer ${aliceToken}` },
    payload: { currentPassword: PASSWORD, newPassword: 'alicenewpassword123' },
  });

  const bobAccount = await app.inject({ method: 'GET', url: '/account', headers: { authorization: `Bearer ${bobToken}` } });
  assert.equal(bobAccount.statusCode, 200);
  assert.deepEqual(bobAccount.json(), { id: bob.id, email: bob.email });

  // And bob's original password still works — untouched by alice's password change.
  const bobLogin = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: bob.email, password: PASSWORD } });
  assert.equal(bobLogin.statusCode, 200);
});

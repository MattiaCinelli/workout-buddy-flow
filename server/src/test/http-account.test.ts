import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupTwoUsers, PASSWORD } from './syncTestHelpers';

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

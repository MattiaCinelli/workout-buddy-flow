import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../auth/password';

test('a hashed password verifies against the original password', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
});

test('a hashed password rejects the wrong password', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('wrong password', hash), false);
});

test('hashing the same password twice produces different output (random salt)', async () => {
  const a = await hashPassword('same password');
  const b = await hashPassword('same password');
  assert.notEqual(a, b);
  // But both must still verify against the original.
  assert.equal(await verifyPassword('same password', a), true);
  assert.equal(await verifyPassword('same password', b), true);
});

test('verify rejects a malformed stored hash instead of throwing', async () => {
  assert.equal(await verifyPassword('anything', 'not-a-real-hash'), false);
  assert.equal(await verifyPassword('anything', ''), false);
  assert.equal(await verifyPassword('anything', 'scrypt:onlyonepart'), false);
});

test('verify rejects a hash produced under a different algorithm tag', async () => {
  assert.equal(await verifyPassword('anything', 'bcrypt:deadbeef:deadbeef'), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db';
import { buildApp } from '../http/app';

test('GET /health requires no auth and reports ok', async () => {
  const app = buildApp(openDb(':memory:'));
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok' });
});

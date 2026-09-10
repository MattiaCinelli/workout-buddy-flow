import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { setupTwoUsers } from './syncTestHelpers';

test('private exercise media requires auth and only serves safe image names', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'workout-buddy-media-'));
  const previous = process.env.EXERCISE_MEDIA_DIR;
  process.env.EXERCISE_MEDIA_DIR = directory;
  t.after(async () => {
    if (previous === undefined) delete process.env.EXERCISE_MEDIA_DIR;
    else process.env.EXERCISE_MEDIA_DIR = previous;
    await fs.rm(directory, { recursive: true, force: true });
  });

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const gif = Buffer.from('GIF89a', 'ascii');
  await fs.writeFile(path.join(directory, 'mobility-test.jpg'), jpeg);
  await fs.writeFile(path.join(directory, 'mobility-test.gif'), gif);
  const { app, aliceToken } = await setupTwoUsers();
  t.after(async () => {
    await app.close();
    app.db.close();
  });

  const unauthenticated = await app.inject({ method: 'GET', url: '/media/exercises/mobility-test.jpg' });
  assert.equal(unauthenticated.statusCode, 401);

  const headers = { authorization: `Bearer ${aliceToken}` };
  const invalid = await app.inject({ method: 'GET', url: '/media/exercises/not-an-image.png', headers });
  assert.equal(invalid.statusCode, 400);

  const missing = await app.inject({ method: 'GET', url: '/media/exercises/mobility-missing.jpg', headers });
  assert.equal(missing.statusCode, 404);

  const response = await app.inject({ method: 'GET', url: '/media/exercises/mobility-test.jpg', headers });
  assert.equal(response.statusCode, 200);
  assert.match(response.headers['content-type'] ?? '', /^image\/jpeg/);
  assert.deepEqual(response.rawPayload, jpeg);
  assert.match(response.headers['cache-control'] ?? '', /private/);

  const animation = await app.inject({ method: 'GET', url: '/media/exercises/mobility-test.gif', headers });
  assert.equal(animation.statusCode, 200);
  assert.match(animation.headers['content-type'] ?? '', /^image\/gif/);
  assert.deepEqual(animation.rawPayload, gif);
});

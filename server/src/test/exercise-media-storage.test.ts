import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { storeInlineExerciseImage } from '../exerciseMediaStorage';

test('inline exercise JPEGs are moved to private media and deduplicated', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'workout-buddy-inline-media-'));
  const previous = process.env.EXERCISE_MEDIA_DIR;
  process.env.EXERCISE_MEDIA_DIR = directory;
  t.after(async () => {
    if (previous === undefined) delete process.env.EXERCISE_MEDIA_DIR;
    else process.env.EXERCISE_MEDIA_DIR = previous;
    await fs.rm(directory, { recursive: true, force: true });
  });

  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const dataUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  const first = storeInlineExerciseImage(dataUrl);
  const second = storeInlineExerciseImage(dataUrl);

  assert.match(first ?? '', /^private-exercise:uploaded-[a-f0-9]{32}\.jpg$/);
  assert.equal(second, first);
  assert.deepEqual(await fs.readFile(path.join(directory, first!.slice('private-exercise:'.length))), bytes);
  assert.equal((await fs.readdir(directory)).length, 1);
});

test('non-inline image references pass through unchanged', () => {
  assert.equal(storeInlineExerciseImage('private-exercise:existing.jpg'), 'private-exercise:existing.jpg');
  assert.equal(storeInlineExerciseImage('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
  assert.equal(storeInlineExerciseImage(undefined), undefined);
});

test('animated GIFs keep their original bytes in private media', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'workout-buddy-inline-gif-'));
  const previous = process.env.EXERCISE_MEDIA_DIR;
  process.env.EXERCISE_MEDIA_DIR = directory;
  t.after(async () => {
    if (previous === undefined) delete process.env.EXERCISE_MEDIA_DIR;
    else process.env.EXERCISE_MEDIA_DIR = previous;
    await fs.rm(directory, { recursive: true, force: true });
  });

  const bytes = Buffer.from('GIF89a', 'ascii');
  const stored = storeInlineExerciseImage(`data:image/gif;base64,${bytes.toString('base64')}`)!;
  assert.match(stored, /^private-exercise:uploaded-[a-f0-9]{32}\.gif$/);
  assert.deepEqual(await fs.readFile(path.join(directory, stored.slice('private-exercise:'.length))), bytes);
});

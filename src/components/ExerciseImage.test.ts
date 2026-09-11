/** @vitest-environment jsdom */
import 'fake-indexeddb/auto';
import { createElement } from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExerciseImage from '@/components/ExerciseImage';
import {
  clearPrivateExerciseImageCache,
  fetchPrivateExerciseImage,
  prefetchPrivateExerciseImages,
  privateExerciseImageFilename,
  refreshPrivateExerciseImage,
} from '@/lib/exerciseMediaClient';

beforeEach(async () => {
  localStorage.clear();
  await clearPrivateExerciseImageCache();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('privateExerciseImageFilename', () => {
  it('recognizes the private media marker', () => {
    expect(privateExerciseImageFilename('private-exercise:mobility-cat-cow.jpg'))
      .toBe('mobility-cat-cow.jpg');
  });

  it('routes legacy public mobility photographs through private media', () => {
    expect(privateExerciseImageFilename('/exercises/mobility-cat-cow.jpg'))
      .toBe('mobility-cat-cow.jpg');
  });

  it('does not intercept unrelated or unsafe image paths', () => {
    expect(privateExerciseImageFilename('/placeholder.svg')).toBeNull();
    expect(privateExerciseImageFilename('/exercises/../mobility-secret.jpg')).toBeNull();
  });
});

describe('private exercise image cache', () => {
  it('keeps a downloaded image available after the server connection is removed', async () => {
    localStorage.setItem('workout-buddy-sync:serverUrl', 'https://sync.example.test');
    localStorage.setItem('workout-buddy-sync:token', 'token');
    const networkImage = new TextEncoder().encode('jpeg-data');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/jpeg', etag: '"image-v1"' }),
      arrayBuffer: async () => networkImage.buffer.slice(0),
    } as Response));
    vi.stubGlobal('fetch', fetchMock);

    const online = await fetchPrivateExerciseImage('mobility-cat-cow.jpg');
    expect(online.size).toBe(networkImage.byteLength);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    localStorage.clear();
    const offline = await fetchPrivateExerciseImage('mobility-cat-cow.jpg');
    expect(offline.size).toBe(networkImage.byteLength);
    expect(offline.type).toBe('image/jpeg');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses the cached ETag and retains the body when the server reports no change', async () => {
    localStorage.setItem('workout-buddy-sync:serverUrl', 'https://sync.example.test');
    localStorage.setItem('workout-buddy-sync:token', 'token');
    const networkImage = new TextEncoder().encode('jpeg-data');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/jpeg', etag: '"image-v1"' }),
        arrayBuffer: async () => networkImage.buffer.slice(0),
      } as Response)
      .mockImplementationOnce(async (_input: string | URL, init?: RequestInit) => {
        expect((init?.headers as Record<string, string>)['If-None-Match']).toBe('"image-v1"');
        return { ok: false, status: 304, headers: new Headers() } as Response;
      });
    vi.stubGlobal('fetch', fetchMock);

    await refreshPrivateExerciseImage('mobility-cat-cow.jpg');
    const unchanged = await refreshPrivateExerciseImage('mobility-cat-cow.jpg');

    expect(unchanged.size).toBe(networkImage.byteLength);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('replaces an on-screen fallback as soon as sync caches the image', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:cached-exercise-image'),
      revokeObjectURL: vi.fn(),
    });
    const view = render(createElement(ExerciseImage, {
      imageUrl: 'private-exercise:mobility-cat-cow.jpg',
      alt: 'Cat-cow',
    }));
    expect(view.getByAltText('Cat-cow').getAttribute('src')).toBe('/placeholder.svg');

    localStorage.setItem('workout-buddy-sync:serverUrl', 'https://sync.example.test');
    localStorage.setItem('workout-buddy-sync:token', 'token');
    const networkImage = new TextEncoder().encode('jpeg-data');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/jpeg', etag: '"image-v1"' }),
      arrayBuffer: async () => networkImage.buffer.slice(0),
    } as Response)));

    await prefetchPrivateExerciseImages(['private-exercise:mobility-cat-cow.jpg']);
    await waitFor(() => {
      expect(view.getByAltText('Cat-cow').getAttribute('src')).toBe('blob:cached-exercise-image');
    });
  });
});

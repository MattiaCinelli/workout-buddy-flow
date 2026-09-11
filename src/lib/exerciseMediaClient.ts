import { DBSchema, openDB } from 'idb';

const SERVER_URL_KEY = 'workout-buddy-sync:serverUrl';
const TOKEN_KEY = 'workout-buddy-sync:token';
const SAFE_PRIVATE_IMAGE_NAME = /^[a-z0-9][a-z0-9-]*\.(?:jpg|gif)$/;
const PRIVATE_EXERCISE_IMAGE_PREFIX = 'private-exercise:';
const LEGACY_PRIVATE_EXERCISE_IMAGE = /^\/exercises\/(mobility-[a-z0-9-]+\.jpg)$/;

interface CachedExerciseImage {
  filename: string;
  data: ArrayBuffer;
  contentType: string;
  etag?: string;
  cachedAt: string;
}

interface ExerciseMediaCacheDB extends DBSchema {
  images: {
    key: string;
    value: CachedExerciseImage;
  };
}

const MEDIA_CACHE_DB_NAME = 'workout-buddy-private-media';
let mediaCacheDbPromise: ReturnType<typeof openDB<ExerciseMediaCacheDB>> | null = null;
const mediaAvailableListeners = new Set<(filename: string) => void>();

export const subscribePrivateExerciseImageAvailable = (
  listener: (filename: string) => void,
): (() => void) => {
  mediaAvailableListeners.add(listener);
  return () => { mediaAvailableListeners.delete(listener); };
};

const notifyPrivateExerciseImageAvailable = (filename: string) => {
  mediaAvailableListeners.forEach(listener => listener(filename));
};

const getMediaCacheDB = () => {
  if (!mediaCacheDbPromise) {
    mediaCacheDbPromise = openDB<ExerciseMediaCacheDB>(MEDIA_CACHE_DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'filename' });
        }
      },
    });
  }
  return mediaCacheDbPromise;
};

const getCachedImage = async (filename: string): Promise<CachedExerciseImage | undefined> => {
  try {
    return await (await getMediaCacheDB()).get('images', filename);
  } catch {
    // A storage failure must not prevent an online image from loading.
    return undefined;
  }
};

const storeCachedImage = async (image: CachedExerciseImage): Promise<void> => {
  try {
    await (await getMediaCacheDB()).put('images', image);
    // Ask browsers not to evict this origin's offline data. Native WebViews
    // normally retain it anyway; unsupported browsers simply skip this.
    await navigator.storage?.persist?.().catch(() => false);
  } catch (error) {
    console.warn('Could not persist an exercise image for offline use:', error);
  }
};

const cachedImageBlob = (image: CachedExerciseImage): Blob => (
  new Blob([image.data], { type: image.contentType })
);

export const privateExerciseImageFilename = (imageUrl: string): string | null => {
  if (imageUrl.startsWith(PRIVATE_EXERCISE_IMAGE_PREFIX)) {
    return imageUrl.slice(PRIVATE_EXERCISE_IMAGE_PREFIX.length);
  }
  return imageUrl.match(LEGACY_PRIVATE_EXERCISE_IMAGE)?.[1] ?? null;
};

const responseError = async (response: Response): Promise<string> => {
  const body = await response.json().catch(() => null) as { error?: string; message?: string } | null;
  return body?.error || body?.message || `Request failed (${response.status})`;
};

const downloadPrivateExerciseImage = async (
  filename: string,
  signal?: AbortSignal,
  etag?: string,
): Promise<CachedExerciseImage | null> => {
  const url = localStorage.getItem(SERVER_URL_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  if (!url || !token) throw new Error('Connect to the sync server to download this image.');

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (etag) headers['If-None-Match'] = etag;
  const response = await fetch(`${url}/media/exercises/${encodeURIComponent(filename)}`, {
    headers,
    signal,
  });
  if (response.status === 304) return null;
  if (!response.ok) throw new Error(await responseError(response));
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) throw new Error('Server returned an invalid exercise image.');
  return {
    filename,
    data: await response.arrayBuffer(),
    contentType,
    etag: response.headers.get('etag') ?? undefined,
    cachedAt: new Date().toISOString(),
  };
};

export const fetchPrivateExerciseImage = async (
  filename: string,
  signal?: AbortSignal,
): Promise<Blob> => {
  if (!SAFE_PRIVATE_IMAGE_NAME.test(filename)) {
    throw new Error('Invalid private exercise image name.');
  }

  const cached = await getCachedImage(filename);
  if (cached) return cachedImageBlob(cached);

  const downloaded = await downloadPrivateExerciseImage(filename, signal);
  if (!downloaded) throw new Error('The server returned no image data.');
  await storeCachedImage(downloaded);
  return cachedImageBlob(downloaded);
};

// Refresh while connected, but always fall back to the persistent device
// copy. ETags make an unchanged image a small 304 response during sync.
export const refreshPrivateExerciseImage = async (
  filename: string,
  signal?: AbortSignal,
): Promise<Blob> => {
  if (!SAFE_PRIVATE_IMAGE_NAME.test(filename)) {
    throw new Error('Invalid private exercise image name.');
  }

  const cached = await getCachedImage(filename);
  try {
    const downloaded = await downloadPrivateExerciseImage(filename, signal, cached?.etag);
    if (!downloaded) {
      if (cached) return cachedImageBlob(cached);
      const retry = await downloadPrivateExerciseImage(filename, signal);
      if (!retry) throw new Error('The server returned no image data.');
      await storeCachedImage(retry);
      return cachedImageBlob(retry);
    }
    await storeCachedImage(downloaded);
    return cachedImageBlob(downloaded);
  } catch (error) {
    if (cached) return cachedImageBlob(cached);
    throw error;
  }
};

export const prefetchPrivateExerciseImages = async (imageUrls: Array<string | undefined>): Promise<void> => {
  const filenames = [...new Set(imageUrls
    .filter((value): value is string => !!value)
    .map(privateExerciseImageFilename)
    .filter((value): value is string => !!value))];

  const failures: string[] = [];
  const concurrency = 4;
  for (let offset = 0; offset < filenames.length; offset += concurrency) {
    const batch = filenames.slice(offset, offset + concurrency);
    await Promise.all(batch.map(async filename => {
      try {
        await refreshPrivateExerciseImage(filename);
        notifyPrivateExerciseImageAvailable(filename);
      } catch {
        failures.push(filename);
      }
    }));
  }
  if (failures.length > 0) {
    console.warn(`${failures.length} private exercise image(s) could not be cached; existing device copies were kept.`);
  }
};

export const removeCachedPrivateExerciseImage = async (imageUrl: string): Promise<void> => {
  const filename = privateExerciseImageFilename(imageUrl);
  if (!filename) return;
  try {
    await (await getMediaCacheDB()).delete('images', filename);
  } catch (error) {
    console.warn('Could not remove the cached exercise image:', error);
  }
};

export const clearPrivateExerciseImageCache = async (): Promise<void> => {
  try {
    await (await getMediaCacheDB()).clear('images');
  } catch {
    // Used by tests and explicit resets; exercise records remain untouched.
  }
};

const SERVER_URL_KEY = 'workout-buddy-sync:serverUrl';
const TOKEN_KEY = 'workout-buddy-sync:token';
const SAFE_PRIVATE_IMAGE_NAME = /^[a-z0-9][a-z0-9-]*\.(?:jpg|gif)$/;
const PRIVATE_EXERCISE_IMAGE_PREFIX = 'private-exercise:';
const LEGACY_PRIVATE_EXERCISE_IMAGE = /^\/exercises\/(mobility-[a-z0-9-]+\.jpg)$/;

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

export const fetchPrivateExerciseImage = async (
  filename: string,
  signal?: AbortSignal,
): Promise<Blob> => {
  if (!SAFE_PRIVATE_IMAGE_NAME.test(filename)) {
    throw new Error('Invalid private exercise image name.');
  }

  const url = localStorage.getItem(SERVER_URL_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  if (!url || !token) throw new Error('Connect to the sync server to view this image.');

  const response = await fetch(`${url}/media/exercises/${encodeURIComponent(filename)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(await responseError(response));
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) throw new Error('Server returned an invalid exercise image.');
  return response.blob();
};

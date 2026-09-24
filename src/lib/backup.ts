import { getDB } from './db';
import { isDemoMode } from './demoMode';
import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { WorkoutSession } from '@/data/workoutSessions';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course } from '@/data/courses';
import { MuscleGroup } from '@/data/muscleGroups';
import { BodyMetric } from '@/data/bodyMetrics';
import { Measurement } from '@/data/measurements';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getCustomTrack, setCustomTrack } from './customAudio';
import {
  cachePrivateExerciseImage, fetchPrivateExerciseImage, privateExerciseImageFilename,
} from './exerciseMediaClient';
import {
  bodyMetricImportSchema, checkExerciseReferences, courseImportSchema, exerciseImportSchema,
  measurementImportSchema, muscleGroupImportSchema, scheduledWorkoutImportSchema, validateImportCollection,
  workoutImportSchema, workoutSessionImportSchema,
} from './importSchemas';

// Device preferences (localStorage) that belong in a portable backup.
// Deliberately excludes anything device- or server-specific: sync
// credentials/watermarks, seed-version markers, in-progress workout state.
export const BACKUP_PREFERENCE_KEYS = [
  'theme',
  'workout-buddy-accessibility-settings',
  'workout-buddy-notification-settings',
  'workout-buddy-body-profile',
  'workout-buddy-bar-weight',
  'workout-buddy-voice-enabled',
  'workout-buddy-onboarded',
  'workout-buddy-detailed-rpe',
  'workout-buddy-workout-folders',
  'workout-buddy-equipment-options',
] as const;

export interface BackupAudioTrack {
  name: string;
  type: string;
  dataUrl: string;
}

export interface BackupMediaFile { type: string; dataUrl: string; }

interface WorkoutBuddyBackupDataV1 {
  exercises: Exercise[];
  workouts: WorkoutEntry[];
  workoutSessions: WorkoutSession[];
  scheduledWorkouts: ScheduledWorkout[];
  courses: Course[];
  // Optional in every version: files written before "My records" existed
  // don't have it, and restoring one of those must leave the device's
  // records alone rather than wipe them.
  measurements?: Measurement[];
}

interface WorkoutBuddyBackupDataV2 extends WorkoutBuddyBackupDataV1 {
  muscleGroups: MuscleGroup[];
  bodyMetrics: BodyMetric[];
}

export type WorkoutBuddyBackup = {
  format: 'workout-buddy-backup';
  version: 1;
  exportedAt: string;
  data: WorkoutBuddyBackupDataV1;
} | {
  format: 'workout-buddy-backup';
  version: 2;
  exportedAt: string;
  data: WorkoutBuddyBackupDataV2;
} | {
  format: 'workout-buddy-backup';
  version: 3;
  exportedAt: string;
  data: WorkoutBuddyBackupDataV2;
  // Device preferences and the optional custom workout audio track, so a
  // backup carries the whole app state, not just training records.
  preferences?: Record<string, string>;
  audioTrack?: BackupAudioTrack;
} | {
  format: 'workout-buddy-backup';
  version: 4;
  exportedAt: string;
  data: WorkoutBuddyBackupDataV2;
  preferences?: Record<string, string>;
  audioTrack?: BackupAudioTrack;
  /** Authenticated private exercise media, keyed by its safe filename. */
  media?: Record<string, BackupMediaFile>;
};

export interface EncryptedWorkoutBuddyBackup {
  format: 'workout-buddy-encrypted-backup';
  version: 1;
  encryption: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const legacyStores = ['exercises', 'workouts', 'workoutSessions', 'scheduledWorkouts', 'courses'] as const;
const stores = [...legacyStores, 'muscleGroups', 'bodyMetrics'] as const;

const gatherPreferences = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of BACKUP_PREFERENCE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) out[key] = value;
    } catch { /* ignore */ }
  }
  return out;
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const privateMediaFrom = async (exercises: Exercise[]): Promise<Record<string, BackupMediaFile>> => {
  const filenames = [...new Set(exercises.flatMap(exercise => [
    exercise.imageUrl, ...Object.values(exercise.directionImageUrls ?? {}),
  ]).filter((value): value is string => !!value)
    .map(privateExerciseImageFilename).filter((value): value is string => !!value))];
  const media: Record<string, BackupMediaFile> = {};
  for (const filename of filenames) {
    try {
      const blob = await fetchPrivateExerciseImage(filename);
      media[filename] = { type: blob.type, dataUrl: await blobToDataUrl(blob) };
    } catch {
      // A missing remote file must not prevent the user's records from being
      // exported. The restore preview reports markers without embedded bytes.
    }
  }
  return media;
};

export const createBackup = async (): Promise<Extract<WorkoutBuddyBackup, { version: 4 }>> => {
  const db = await getDB();
  const [exercises, workouts, workoutSessions, scheduledWorkouts, courses, muscleGroups, bodyMetrics, measurements] = await Promise.all([
    db.getAll('exercises'), db.getAll('workouts'), db.getAll('workoutSessions'),
    db.getAll('scheduledWorkouts'), db.getAll('courses'), db.getAll('muscleGroups'), db.getAll('bodyMetrics'),
    db.getAll('measurements'),
  ]);
  const track = await getCustomTrack().catch(() => null);
  const media = await privateMediaFrom(exercises);
  return {
    format: 'workout-buddy-backup', version: 4, exportedAt: new Date().toISOString(),
    data: { exercises, workouts, workoutSessions, scheduledWorkouts, courses, muscleGroups, bodyMetrics, measurements },
    preferences: gatherPreferences(),
    media,
    ...(track
      ? { audioTrack: { name: track.name, type: track.type, dataUrl: await blobToDataUrl(track.blob) } }
      : {}),
  };
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
};
const base64ToBytes = (value: string): Uint8Array => Uint8Array.from(atob(value), character => character.charCodeAt(0));

export const encryptBackup = async (backup: WorkoutBuddyBackup, passphrase: string): Promise<EncryptedWorkoutBuddyBackup> => {
  if (passphrase.length < 8) throw new Error('Use a backup password of at least 8 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 250_000;
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt'],
  );
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(backup)));
  return {
    format: 'workout-buddy-encrypted-backup', version: 1, encryption: 'AES-GCM', kdf: 'PBKDF2-SHA256',
    iterations, salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
};

export const decryptBackup = async (encrypted: EncryptedWorkoutBuddyBackup, passphrase: string): Promise<ParsedBackup> => {
  try {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(encrypted.salt), iterations: encrypted.iterations }, material,
      { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
    );
    const clear = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(encrypted.iv) }, key, base64ToBytes(encrypted.ciphertext),
    );
    return parseBackup(new TextDecoder().decode(clear));
  } catch {
    throw new Error('The backup password is incorrect or the encrypted file is damaged.');
  }
};

export const isEncryptedBackupText = (text: string): boolean => {
  try { return (JSON.parse(text) as { format?: string }).format === 'workout-buddy-encrypted-backup'; }
  catch { return false; }
};

export const parseEncryptedBackupEnvelope = (text: string): EncryptedWorkoutBuddyBackup => {
  const value = JSON.parse(text) as Partial<EncryptedWorkoutBuddyBackup>;
  if (value.format !== 'workout-buddy-encrypted-backup' || value.version !== 1
    || value.encryption !== 'AES-GCM' || value.kdf !== 'PBKDF2-SHA256'
    || typeof value.iterations !== 'number' || typeof value.salt !== 'string'
    || typeof value.iv !== 'string' || typeof value.ciphertext !== 'string') {
    throw new Error('This is not a supported encrypted Workout Buddy backup.');
  }
  return value as EncryptedWorkoutBuddyBackup;
};

export const downloadBackup = async (passphrase = '') => {
  const backup = await createBackup();
  const payload = passphrase ? await encryptBackup(backup, passphrase) : backup;
  const json = JSON.stringify(payload, null, 2);
  const filename = `workout-buddy-${backup.exportedAt.slice(0, 10)}${passphrase ? '-encrypted' : ''}.json`;
  if (Capacitor.isNativePlatform()) {
    const saved = await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Workout Buddy backup', text: 'Save this file somewhere safe.', url: saved.uri, dialogTitle: 'Export Workout Buddy data' });
    localStorage.setItem(LAST_EXPORTED_BACKUP_KEY, backup.exportedAt);
    return;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  localStorage.setItem(LAST_EXPORTED_BACKUP_KEY, backup.exportedAt);
};

const AUTOMATIC_BACKUP_PATH = 'backups/automatic-latest.json';
const LAST_AUTOMATIC_BACKUP_KEY = 'workout-buddy-backup:lastAutomaticAt';
const LAST_EXPORTED_BACKUP_KEY = 'workout-buddy-backup:lastExportedAt';
export const AUTOMATIC_BACKUP_UPDATED_EVENT = 'workout-buddy:automatic-backup-updated';

export const getLastAutomaticBackupAt = (): string | null => localStorage.getItem(LAST_AUTOMATIC_BACKUP_KEY);
export const getLastExportedBackupAt = (): string | null => localStorage.getItem(LAST_EXPORTED_BACKUP_KEY);

// Native-only rolling safety copy in the app's private files directory.
// This protects against a damaged IndexedDB database, while a manual export
// or server sync is still required to survive uninstalling or losing a phone.
export const createAutomaticBackup = async (): Promise<boolean> => {
  // A demo session must never replace the real recovery snapshot.
  if (!Capacitor.isNativePlatform() || isDemoMode()) return false;
  const backup = await createBackup();
  await Filesystem.writeFile({
    path: AUTOMATIC_BACKUP_PATH,
    data: JSON.stringify(backup),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  localStorage.setItem(LAST_AUTOMATIC_BACKUP_KEY, backup.exportedAt);
  window.dispatchEvent(new Event(AUTOMATIC_BACKUP_UPDATED_EVENT));
  return true;
};

export const readAutomaticBackup = async (): Promise<ParsedBackup> => {
  if (!Capacitor.isNativePlatform()) throw new Error('Automatic snapshots are available in the installed phone app.');
  const file = await Filesystem.readFile({
    path: AUTOMATIC_BACKUP_PATH,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
  if (typeof file.data !== 'string') throw new Error('The automatic snapshot could not be read.');
  return parseBackup(file.data);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// A backup with photo-heavy exercises and a custom audio track is
// legitimately large; anything past this is almost certainly hostile or
// corrupt, and parsing it would just bloat IndexedDB.
const MAX_IMPORT_BYTES = 128 * 1024 * 1024;
const MAX_IMAGE_URL_LENGTH = 4 * 1024 * 1024; // ~3 MB once base64-decoded
const MAX_BACKUP_MEDIA_DATA_URL_LENGTH = 8 * 1024 * 1024; // up to the 5 MB stored-file limit
const MAX_AUDIO_DATA_URL_LENGTH = 40 * 1024 * 1024; // ~30 MB decoded

// An imported `imageUrl` is untrusted. Private server images use an inert,
// filename-only marker which the authenticated ExerciseImage component resolves;
// also keep a plain https URL or an inline image data URI of a sane size.
const sanitizeImageUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_URL_LENGTH) return undefined;
  return /^private-exercise:[a-z0-9][a-z0-9-]*\.(?:jpg|gif|svg)$/.test(value)
    || /^https:\/\//i.test(value) || /^data:image\/(png|jpe?g|gif|webp|avif);/i.test(value)
    ? value : undefined;
};

// An imported `videoUrl` is untrusted too, and it's only ever put in an
// href / opened in a new tab — so it must be a plain https link, never a
// data: or javascript: URI. Drop anything else.
const MAX_VIDEO_URL_LENGTH = 2048;
const sanitizeVideoUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length > MAX_VIDEO_URL_LENGTH) return undefined;
  try {
    return new URL(value).protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
};

const scrubImportedExerciseUrls = (parsed: Record<string, unknown>): void => {
  const data = parsed.data;
  if (!isRecord(data) || !Array.isArray(data.exercises)) return;
  for (const item of data.exercises) {
    if (!isRecord(item)) continue;
    if ('imageUrl' in item) item.imageUrl = sanitizeImageUrl(item.imageUrl);
    if ('directionImageUrls' in item) {
      if (!isRecord(item.directionImageUrls)) {
        item.directionImageUrls = undefined;
      } else {
        const directionImageUrls = item.directionImageUrls;
        item.directionImageUrls = Object.fromEntries(
          ['left', 'right', 'alternate', 'forward', 'backward',
            'left-forward', 'right-forward', 'left-backward', 'right-backward']
            .map(direction => [direction, sanitizeImageUrl(directionImageUrls[direction])] as const)
            .filter((entry): entry is readonly [string, string] => !!entry[1]),
        );
      }
    }
    if ('videoUrl' in item) item.videoUrl = sanitizeVideoUrl(item.videoUrl);
  }
};

export interface ParsedBackup {
  data: WorkoutBuddyBackup;
  /** Non-fatal issues found while validating — surfaced before the restore. */
  warnings: string[];
}

const dataUrlToFile = async (dataUrl: string, name: string, type: string): Promise<File> => {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name || 'track', { type: type || blob.type });
};

export const parseBackup = (text: string): ParsedBackup => {
  if (text.length > MAX_IMPORT_BYTES) throw new Error('That backup file is too large to import.');
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || parsed.format !== 'workout-buddy-backup'
    || ![1, 2, 3, 4].includes(parsed.version as number) || !isRecord(parsed.data)) {
    throw new Error('This is not a supported Workout Buddy backup.');
  }
  const version = parsed.version as 1 | 2 | 3 | 4;
  const requiredStores = version === 1 ? legacyStores : stores;
  for (const store of requiredStores) {
    if (!Array.isArray((parsed.data as Record<string, unknown>)[store])) {
      throw new Error(`Backup is missing ${store}.`);
    }
  }
  scrubImportedExerciseUrls(parsed);

  const warnings: string[] = [];
  const data = parsed.data as Record<string, unknown[]>;
  const validate = (name: string, schema: Parameters<typeof validateImportCollection>[2]) => {
    const result = validateImportCollection(name, data[name], schema);
    warnings.push(...result.warnings);
    data[name] = result.records as unknown[];
    return result.records;
  };
  const asContainer = (label: string) => (item: Record<string, unknown>) => ({
    label: `${label} "${String(item.title ?? item.id)}"`,
    sets: Array.isArray(item.sets) ? (item.sets as Array<{ exerciseId: string }>) : [],
  });

  const exercises = validate('exercises', exerciseImportSchema);
  const workouts = validate('workouts', workoutImportSchema);
  const sessions = validate('workoutSessions', workoutSessionImportSchema);
  validate('scheduledWorkouts', scheduledWorkoutImportSchema);
  validate('courses', courseImportSchema);
  if (version !== 1) {
    validate('muscleGroups', muscleGroupImportSchema);
    validate('bodyMetrics', bodyMetricImportSchema);
  }
  if ('measurements' in data) {
    if (!Array.isArray(data.measurements)) throw new Error('Backup measurements are malformed.');
    validate('measurements', measurementImportSchema);
  }

  warnings.push(...checkExerciseReferences(
    exercises.map(item => item.id),
    [...workouts.map(asContainer('Workout')), ...sessions.map(asContainer('Session'))],
  ));

  if (version >= 3) {
    const clean: Record<string, string> = {};
    if (isRecord(parsed.preferences)) {
      for (const key of BACKUP_PREFERENCE_KEYS) {
        const value = parsed.preferences[key];
        if (typeof value === 'string' && value.length < 100_000) clean[key] = value;
      }
    }
    parsed.preferences = clean;

    if (isRecord(parsed.audioTrack)) {
      const track = parsed.audioTrack;
      const valid = typeof track.dataUrl === 'string'
        && /^data:audio\//i.test(track.dataUrl)
        && track.dataUrl.length <= MAX_AUDIO_DATA_URL_LENGTH;
      if (!valid) {
        parsed.audioTrack = undefined;
        warnings.push('The custom audio track was dropped (invalid or too large).');
      }
    }
  }

  if (version === 4) {
    const cleanMedia: Record<string, BackupMediaFile> = {};
    if (isRecord(parsed.media)) {
      for (const [filename, raw] of Object.entries(parsed.media)) {
        if (!/^[a-z0-9][a-z0-9-]*\.(?:jpg|gif|svg)$/.test(filename) || !isRecord(raw)) continue;
        if (typeof raw.type !== 'string' || !raw.type.startsWith('image/')
          || typeof raw.dataUrl !== 'string' || !raw.dataUrl.startsWith(`data:${raw.type};`)
          || raw.dataUrl.length > MAX_BACKUP_MEDIA_DATA_URL_LENGTH) continue;
        cleanMedia[filename] = { type: raw.type, dataUrl: raw.dataUrl };
      }
    }
    parsed.media = cleanMedia;
    const referenced = new Set((data.exercises as Exercise[]).flatMap(exercise => [
      exercise.imageUrl, ...Object.values(exercise.directionImageUrls ?? {}),
    ]).filter((value): value is string => !!value).map(privateExerciseImageFilename)
      .filter((value): value is string => !!value));
    const missing = [...referenced].filter(filename => !cleanMedia[filename]);
    if (missing.length) warnings.push(`${missing.length} private exercise image${missing.length === 1 ? '' : 's'} could not be embedded and will require server sync after restore.`);
  }

  return { data: parsed as unknown as WorkoutBuddyBackup, warnings };
};

export const restoreBackup = async (backup: WorkoutBuddyBackup) => {
  const db = await getDB();
  // Version 1 predates muscle-group and body-metric backup support. Leave
  // those device stores untouched when restoring an old file: clearing
  // data that the file could never have contained would be destructive.
  const storesToRestore: Array<typeof stores[number] | 'measurements'> = [...(backup.version === 1 ? legacyStores : stores)];
  // Same rule for "My records": only replace them when the file carries them.
  const restoredMeasurements = Array.isArray((backup.data as { measurements?: unknown }).measurements);
  if (restoredMeasurements) storesToRestore.push('measurements');
  const tx = db.transaction(storesToRestore, 'readwrite');
  for (const storeName of storesToRestore) {
    const store = tx.objectStore(storeName);
    await store.clear();
    for (const record of (backup.data as unknown as Record<string, unknown[] | undefined>)[storeName] ?? []) {
      await (store as unknown as { put: (value: unknown) => Promise<unknown> }).put(record);
    }
  }
  await tx.done;

  if (backup.version === 3 || backup.version === 4) {
    for (const [key, value] of Object.entries(backup.preferences ?? {})) {
      if ((BACKUP_PREFERENCE_KEYS as readonly string[]).includes(key)) {
        try { localStorage.setItem(key, value); } catch { /* ignore */ }
      }
    }
    if (backup.audioTrack) {
      try {
        await setCustomTrack(await dataUrlToFile(backup.audioTrack.dataUrl, backup.audioTrack.name, backup.audioTrack.type));
      } catch (error) {
        console.warn('Could not restore the custom audio track:', error);
      }
    }
  }
  if (backup.version === 4) {
    for (const [filename, media] of Object.entries(backup.media ?? {})) {
      try { await cachePrivateExerciseImage(filename, await (await fetch(media.dataUrl)).blob()); }
      catch (error) { console.warn(`Could not restore exercise image ${filename}:`, error); }
    }
  }
};

// ---------------------------------------------------------------------------
// Sharing one exercise or one workout, as opposed to a whole-device backup.
//
// The bundle carries every dependency the recipient needs so it drops into a
// library that has never seen it: a shared workout brings the exercises its
// sets reference, and every shared exercise brings the muscle groups it's
// tagged with. Importing MERGES (it never clears) and remaps ids —
// same-named exercises and muscle groups already in the library are reused,
// anything else is created fresh with new ids, and the workout's set
// references are rewritten to match. Exercise images ride along inline as
// data URLs, exactly as they're stored locally.
// ---------------------------------------------------------------------------

export interface WorkoutBuddyShare {
  format: 'workout-buddy-share';
  version: 1;
  exportedAt: string;
  // Which one the user chose to share — drives the import prompt's wording.
  // The payload always carries the full dependency closure regardless.
  kind: 'exercise' | 'workout';
  data: {
    exercises: Exercise[];
    workouts: WorkoutEntry[];
    muscleGroups: MuscleGroup[];
  };
}

const normalizeName = (name: string) => name.trim().toLowerCase();

const omitKeys = <T extends object, K extends keyof T>(source: T, keys: readonly K[]): Omit<T, K> => {
  const clone = { ...source } as unknown as Record<string, unknown>;
  for (const key of keys) delete clone[key as string];
  return clone as unknown as Omit<T, K>;
};

const muscleGroupsFor = (exercises: Exercise[], all: MuscleGroup[]): MuscleGroup[] => {
  const referenced = new Set(exercises.flatMap(exercise => exercise.muscleGroups));
  return all.filter(group => referenced.has(group.id));
};

export const buildExerciseShare = (exercise: Exercise, muscleGroups: MuscleGroup[]): WorkoutBuddyShare => ({
  format: 'workout-buddy-share', version: 1, exportedAt: new Date().toISOString(), kind: 'exercise',
  data: { exercises: [exercise], workouts: [], muscleGroups: muscleGroupsFor([exercise], muscleGroups) },
});

export const buildWorkoutShare = (
  workout: WorkoutEntry, exercises: Exercise[], muscleGroups: MuscleGroup[],
): WorkoutBuddyShare => {
  const referencedIds = new Set(workout.sets.map(set => set.exerciseId));
  const referencedExercises = exercises.filter(exercise => referencedIds.has(exercise.id));
  return {
    format: 'workout-buddy-share', version: 1, exportedAt: new Date().toISOString(), kind: 'workout',
    data: {
      exercises: referencedExercises, workouts: [workout],
      muscleGroups: muscleGroupsFor(referencedExercises, muscleGroups),
    },
  };
};

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'item';

// Native: hand the JSON file to the OS share sheet. Web: trigger a download.
const shareOrDownloadFile = async (payload: object, filename: string) => {
  const json = JSON.stringify(payload, null, 2);
  if (Capacitor.isNativePlatform()) {
    const saved = await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: filename, text: 'Open in Workout Buddy to import.', url: saved.uri, dialogTitle: 'Share' });
    return;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const shareExercise = (exercise: Exercise, muscleGroups: MuscleGroup[]) =>
  shareOrDownloadFile(buildExerciseShare(exercise, muscleGroups), `exercise-${slugify(exercise.name)}.json`);

export const shareWorkout = (workout: WorkoutEntry, exercises: Exercise[], muscleGroups: MuscleGroup[]) =>
  shareOrDownloadFile(buildWorkoutShare(workout, exercises, muscleGroups), `workout-${slugify(workout.title)}.json`);

export interface ParsedShare {
  data: WorkoutBuddyShare;
  warnings: string[];
}

export const parseShare = (text: string): ParsedShare => {
  if (text.length > MAX_IMPORT_BYTES) throw new Error('That shared file is too large to import.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('That file is not valid JSON.'); }
  if (isRecord(parsed) && parsed.format === 'workout-buddy-backup') {
    throw new Error('That is a full backup file — use Restore Backup on the Settings page instead.');
  }
  if (!isRecord(parsed) || parsed.format !== 'workout-buddy-share' || parsed.version !== 1 || !isRecord(parsed.data)) {
    throw new Error('This is not a shared Workout Buddy exercise or workout.');
  }
  for (const key of ['exercises', 'workouts', 'muscleGroups'] as const) {
    if (!Array.isArray((parsed.data as Record<string, unknown>)[key])) {
      throw new Error(`Shared file has invalid ${key}.`);
    }
  }
  scrubImportedExerciseUrls(parsed);

  const warnings: string[] = [];
  const data = parsed.data as Record<string, unknown[]>;
  const validate = (name: string, schema: Parameters<typeof validateImportCollection>[2]) => {
    const result = validateImportCollection(name, data[name], schema);
    warnings.push(...result.warnings);
    data[name] = result.records as unknown[];
    return result.records;
  };
  const exercises = validate('exercises', exerciseImportSchema);
  const workouts = validate('workouts', workoutImportSchema);
  validate('muscleGroups', muscleGroupImportSchema);

  if (exercises.length === 0 && workouts.length === 0) {
    throw new Error('Shared file has nothing usable to import.');
  }
  warnings.push(...checkExerciseReferences(
    exercises.map(item => item.id),
    workouts.map(item => ({
      label: `Workout "${String(item.title ?? item.id)}"`,
      sets: Array.isArray(item.sets) ? (item.sets as Array<{ exerciseId: string }>) : [],
    })),
  ));

  return { data: parsed as unknown as WorkoutBuddyShare, warnings };
};

export interface ShareImportDeps {
  exercises: Exercise[];
  muscleGroups: MuscleGroup[];
  createExercise: (data: Omit<Exercise, 'id'>) => Promise<Exercise>;
  createWorkout: (data: Omit<WorkoutEntry, 'id'>) => Promise<WorkoutEntry>;
  createMuscleGroup: (data: Omit<MuscleGroup, 'id'>) => Promise<MuscleGroup>;
}

export interface ShareImportSummary {
  newExercises: number;
  reusedExercises: number;
  newMuscleGroups: number;
  workouts: number;
}

// What importing this share would add, resolved against the current library
// — powers the confirmation prompt without mutating anything.
export const summarizeShareImport = (
  share: WorkoutBuddyShare, exercises: Exercise[], muscleGroups: MuscleGroup[],
): ShareImportSummary => {
  const knownExercise = new Set(exercises.map(item => normalizeName(item.name)));
  const knownGroup = new Set(muscleGroups.map(item => normalizeName(item.name)));
  let reusedExercises = 0;
  let newExercises = 0;
  for (const exercise of share.data.exercises) {
    if (knownExercise.has(normalizeName(exercise.name))) reusedExercises += 1;
    else newExercises += 1;
  }
  return {
    newExercises,
    reusedExercises,
    newMuscleGroups: share.data.muscleGroups.filter(group => !knownGroup.has(normalizeName(group.name))).length,
    workouts: share.data.workouts.length,
  };
};

export const importShare = async (share: WorkoutBuddyShare, deps: ShareImportDeps): Promise<ShareImportSummary> => {
  const { exercises, muscleGroups, createExercise, createWorkout, createMuscleGroup } = deps;

  // 1. Muscle groups: reuse an existing one with the same name, else create
  //    it. Track incoming-id -> resolved-id so exercise tags can follow.
  const groupIdMap = new Map<string, string>();
  let newMuscleGroups = 0;
  for (const group of share.data.muscleGroups) {
    const existing = muscleGroups.find(item => normalizeName(item.name) === normalizeName(group.name));
    if (existing) { groupIdMap.set(group.id, existing.id); continue; }
    const created = await createMuscleGroup({ name: group.name });
    groupIdMap.set(group.id, created.id);
    newMuscleGroups += 1;
  }
  const mapGroupId = (id: string) => groupIdMap.get(id) ?? id;

  // 2. Exercises: reuse by name (a non-destructive merge — the recipient
  //    keeps their own version), else create fresh with remapped tags.
  const exerciseIdMap = new Map<string, string>();
  let newExercises = 0;
  let reusedExercises = 0;
  for (const exercise of share.data.exercises) {
    const existing = exercises.find(item => normalizeName(item.name) === normalizeName(exercise.name));
    if (existing) { exerciseIdMap.set(exercise.id, existing.id); reusedExercises += 1; continue; }
    const created = await createExercise({
      ...omitKeys(exercise, ['id', 'updatedAt', 'deletedAt']),
      muscleGroups: (exercise.muscleGroups ?? []).map(mapGroupId),
    });
    exerciseIdMap.set(exercise.id, created.id);
    newExercises += 1;
  }
  const mapExerciseId = (id: string) => exerciseIdMap.get(id) ?? id;

  // 3. Workouts: always created new (a copy in the recipient's library),
  //    with every set's exerciseId rewritten to the resolved exercise.
  for (const workout of share.data.workouts) {
    await createWorkout({
      ...omitKeys(workout, ['id', 'updatedAt', 'deletedAt', 'favorite']),
      date: new Date().toISOString(),
      sets: workout.sets.map(set => ({ ...set, exerciseId: mapExerciseId(set.exerciseId) })),
    });
  }

  return { newExercises, reusedExercises, newMuscleGroups, workouts: share.data.workouts.length };
};

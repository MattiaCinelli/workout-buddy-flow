import { getDB } from './db';
import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { WorkoutSession } from '@/data/workoutSessions';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course } from '@/data/courses';
import { MuscleGroup } from '@/data/muscleGroups';
import { BodyMetric } from '@/data/bodyMetrics';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface WorkoutBuddyBackupDataV1 {
  exercises: Exercise[];
  workouts: WorkoutEntry[];
  workoutSessions: WorkoutSession[];
  scheduledWorkouts: ScheduledWorkout[];
  courses: Course[];
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
};

const legacyStores = ['exercises', 'workouts', 'workoutSessions', 'scheduledWorkouts', 'courses'] as const;
const stores = [...legacyStores, 'muscleGroups', 'bodyMetrics'] as const;

export const createBackup = async (): Promise<Extract<WorkoutBuddyBackup, { version: 2 }>> => {
  const db = await getDB();
  const [exercises, workouts, workoutSessions, scheduledWorkouts, courses, muscleGroups, bodyMetrics] = await Promise.all([
    db.getAll('exercises'), db.getAll('workouts'), db.getAll('workoutSessions'),
    db.getAll('scheduledWorkouts'), db.getAll('courses'), db.getAll('muscleGroups'), db.getAll('bodyMetrics'),
  ]);
  return {
    format: 'workout-buddy-backup', version: 2, exportedAt: new Date().toISOString(),
    data: { exercises, workouts, workoutSessions, scheduledWorkouts, courses, muscleGroups, bodyMetrics },
  };
};

export const downloadBackup = async () => {
  const backup = await createBackup();
  const json = JSON.stringify(backup, null, 2);
  const filename = `workout-buddy-${backup.exportedAt.slice(0, 10)}.json`;
  if (Capacitor.isNativePlatform()) {
    const saved = await Filesystem.writeFile({ path: filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: 'Workout Buddy backup', text: 'Save this file somewhere safe.', url: saved.uri, dialogTitle: 'Export Workout Buddy data' });
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// A backup with photo-heavy exercises is legitimately large; anything past
// this is almost certainly hostile or corrupt, and parsing it would just
// bloat IndexedDB.
const MAX_IMPORT_BYTES = 64 * 1024 * 1024;
const MAX_IMAGE_URL_LENGTH = 4 * 1024 * 1024; // ~3 MB once base64-decoded

// An imported `imageUrl` is untrusted. Keep only a plain https URL or an
// inline image data URI of a sane size; drop anything else (javascript:,
// data:text/html, absurdly long strings) rather than storing and rendering it.
const sanitizeImageUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_URL_LENGTH) return undefined;
  return /^https:\/\//i.test(value) || /^data:image\/(png|jpe?g|gif|webp|avif);/i.test(value)
    ? value : undefined;
};

const scrubImportedImages = (parsed: Record<string, unknown>): void => {
  const data = parsed.data;
  if (!isRecord(data) || !Array.isArray(data.exercises)) return;
  for (const item of data.exercises) {
    if (isRecord(item) && 'imageUrl' in item) item.imageUrl = sanitizeImageUrl(item.imageUrl);
  }
};

export const parseBackup = (text: string): WorkoutBuddyBackup => {
  if (text.length > MAX_IMPORT_BYTES) throw new Error('That backup file is too large to import.');
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || parsed.format !== 'workout-buddy-backup'
    || (parsed.version !== 1 && parsed.version !== 2) || !isRecord(parsed.data)) {
    throw new Error('This is not a supported Workout Buddy backup.');
  }
  const requiredStores = parsed.version === 2 ? stores : legacyStores;
  for (const store of requiredStores) {
    if (!Array.isArray(parsed.data[store])) throw new Error(`Backup is missing ${store}.`);
    if (parsed.data[store].some(item => !isRecord(item) || typeof item.id !== 'string')) {
      throw new Error(`Backup contains invalid ${store} records.`);
    }
  }
  scrubImportedImages(parsed);
  return parsed as unknown as WorkoutBuddyBackup;
};

export const restoreBackup = async (backup: WorkoutBuddyBackup) => {
  const db = await getDB();
  // Version 1 predates muscle-group and body-metric backup support. Leave
  // those device stores untouched when restoring an old file: clearing
  // data that the file could never have contained would be destructive.
  const storesToRestore = backup.version === 2 ? stores : legacyStores;
  const tx = db.transaction(storesToRestore, 'readwrite');
  for (const storeName of storesToRestore) {
    const store = tx.objectStore(storeName);
    await store.clear();
    for (const record of backup.data[storeName] ?? []) await store.put(record);
  }
  await tx.done;
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

export const parseShare = (text: string): WorkoutBuddyShare => {
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
  const data = parsed.data;
  for (const key of ['exercises', 'workouts', 'muscleGroups'] as const) {
    const value = data[key];
    if (!Array.isArray(value) || value.some(item => !isRecord(item) || typeof item.id !== 'string')) {
      throw new Error(`Shared file has invalid ${key}.`);
    }
  }
  if ((data.exercises as unknown[]).length === 0 && (data.workouts as unknown[]).length === 0) {
    throw new Error('Shared file has nothing to import.');
  }
  scrubImportedImages(parsed);
  return parsed as unknown as WorkoutBuddyShare;
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

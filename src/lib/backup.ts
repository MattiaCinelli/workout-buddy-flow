import { getDB } from './db';
import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { WorkoutSession } from '@/data/workoutSessions';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course } from '@/data/courses';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface WorkoutBuddyBackup {
  format: 'workout-buddy-backup';
  version: 1;
  exportedAt: string;
  data: {
    exercises: Exercise[];
    workouts: WorkoutEntry[];
    workoutSessions: WorkoutSession[];
    scheduledWorkouts: ScheduledWorkout[];
    courses: Course[];
  };
}

const stores = ['exercises', 'workouts', 'workoutSessions', 'scheduledWorkouts', 'courses'] as const;

export const createBackup = async (): Promise<WorkoutBuddyBackup> => {
  const db = await getDB();
  const [exercises, workouts, workoutSessions, scheduledWorkouts, courses] = await Promise.all([
    db.getAll('exercises'), db.getAll('workouts'), db.getAll('workoutSessions'),
    db.getAll('scheduledWorkouts'), db.getAll('courses')
  ]);
  return {
    format: 'workout-buddy-backup', version: 1, exportedAt: new Date().toISOString(),
    data: { exercises, workouts, workoutSessions, scheduledWorkouts, courses }
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

export const parseBackup = (text: string): WorkoutBuddyBackup => {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || parsed.format !== 'workout-buddy-backup' || parsed.version !== 1 || !isRecord(parsed.data)) {
    throw new Error('This is not a supported Workout Buddy backup.');
  }
  for (const store of stores) {
    if (!Array.isArray(parsed.data[store])) throw new Error(`Backup is missing ${store}.`);
    if (parsed.data[store].some(item => !isRecord(item) || typeof item.id !== 'string')) {
      throw new Error(`Backup contains invalid ${store} records.`);
    }
  }
  return parsed as unknown as WorkoutBuddyBackup;
};

export const restoreBackup = async (backup: WorkoutBuddyBackup) => {
  const db = await getDB();
  const tx = db.transaction(stores, 'readwrite');
  for (const storeName of stores) {
    const store = tx.objectStore(storeName);
    await store.clear();
    for (const record of backup.data[storeName]) await store.put(record);
  }
  await tx.done;
};

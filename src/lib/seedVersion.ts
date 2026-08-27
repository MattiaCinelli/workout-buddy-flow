import { exerciseList } from '@/data/exercises';
import { workoutHistory } from '@/data/workoutHistory';
import { defaultCourses } from '@/data/courses';
import { defaultMuscleGroups } from '@/data/muscleGroups';

// Bump this whenever a default list in src/data/*.ts GAINS entries that
// existing installs should pick up (new starter exercises, workouts,
// courses, muscle groups). Removing or editing a default is not a reason to
// bump — the migration is purely additive and never touches a record the
// user already has (or has deleted).
export const SEED_VERSION = 1;

// Every id the app ships as a default. A tombstone for one of these must
// NOT be compacted away by sync — it is the only record that the user
// deleted a seed item, and losing it would let a later seed-version
// migration re-add that item. (There are only ever a handful — just the
// seed items a given user chose to delete.)
export const SEED_IDS: ReadonlySet<string> = new Set(
  [...exerciseList, ...workoutHistory, ...defaultCourses, ...defaultMuscleGroups].map(item => item.id),
);

const storageKey = (collection: string) => `workout-buddy-seed-version:${collection}`;

export const getSeedVersion = (collection: string): number => {
  try {
    const raw = Number(localStorage.getItem(storageKey(collection)));
    return Number.isFinite(raw) ? raw : 0;
  } catch {
    return 0;
  }
};

export const setSeedVersion = (collection: string, version: number): void => {
  try {
    localStorage.setItem(storageKey(collection), String(version));
  } catch {
    /* private mode / storage disabled — the migration just runs again next load */
  }
};

// Which defaults a non-empty store is still missing. Only runs when the
// store's recorded seed version is behind, and only adds ids the store has
// never seen — a default the user deleted leaves a tombstone row, so it is
// not re-added.
export const pendingSeedAdditions = <T extends { id: string }>(
  stored: T[],
  defaults: T[],
  storedVersion: number,
  currentVersion: number,
): T[] => {
  if (storedVersion >= currentVersion || defaults.length === 0) return [];
  const known = new Set(stored.map(record => record.id));
  return defaults.filter(item => !known.has(item.id));
};

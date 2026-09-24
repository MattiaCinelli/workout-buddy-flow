import { demoScopedKey } from './demoMode';

export const WORKOUT_FOLDERS_KEY = 'workout-buddy-workout-folders';
export const WORKOUT_FOLDERS_CHANGE_EVENT = 'workout-buddy-workout-folders-changed';

export const normalizeWorkoutFolders = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((folder): folder is string => typeof folder === 'string')
      .map(folder => folder.trim())
      .filter(Boolean),
  )).sort((a, b) => a.localeCompare(b));
};

export const readWorkoutFolders = (): string[] => {
  try {
    return normalizeWorkoutFolders(JSON.parse(localStorage.getItem(demoScopedKey(WORKOUT_FOLDERS_KEY)) || '[]'));
  } catch {
    return [];
  }
};

export const writeWorkoutFolders = (folders: string[]): void => {
  localStorage.setItem(demoScopedKey(WORKOUT_FOLDERS_KEY), JSON.stringify(normalizeWorkoutFolders(folders)));
  window.dispatchEvent(new Event(WORKOUT_FOLDERS_CHANGE_EVENT));
};

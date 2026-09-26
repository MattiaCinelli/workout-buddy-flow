import { Exercise, exerciseList } from '@/data/exercises';
import {
  getAllExercisesFromDB,
  saveExerciseToDB,
  deleteExerciseFromDB,
  bulkSaveExercisesToDB
} from '@/lib/db';
import { useIndexedDBCollection } from './useIndexedDBCollection';
import { exerciseNamesConflict } from '@/lib/exerciseAliases';

const legacySeedImages: Record<string, string> = {
  '10': '/exercises/stretch-forward-fold.svg',
  '28': '/exercises/stretch-forward-fold.svg',
  '29': '/exercises/stretch-figure-four.svg',
  '30': '/exercises/stretch-hip-flexor.svg',
  '31': '/exercises/childs-pose.svg',
  '32': '/exercises/cat-cow.svg',
  '34': '/exercises/downward-dog.svg',
  '36': '/exercises/stretch-arm-across.svg',
  '37': '/exercises/stretch-calf.svg',
};

const courseExerciseIds = new Set([
  'mobility-half-split-stretch',
  'mobility-adductor-rock-back',
  'mobility-side-leg-raise',
  'mobility-childs-pose-side-reach',
  'mobility-reverse-lunge',
  'mobility-full-range-calf-raise',
  'mobility-overhead-reach',
]);

// Built-in instructions rewritten since earlier releases, keyed by the text
// they replace. An install still holding the old wording gets the new one;
// instructions the user edited no longer match and are left alone.
const revisedInstructions: Record<string, string> = {
  '37': 'Facing a wall, step one foot well back with the heel down and knee straight. Lean into the wall until you feel a stretch in the back-leg calf, then switch sides.',
  'mobility-bent-knee-soleus-stretch': 'Face a wall with both hands supported and step one foot behind you. Keep the back heel down and toes pointing forward, then bend both knees and gently sink forward until you feel the stretch lower in the back calf. Keep the rear arch lifted and do not let the knee collapse inward.',
};

// A pre-release build tagged these built-ins as warm-ups on its own. The
// tags are cleared once per device; after that only the user sets the tag.
const autoTaggedWarmupIds = new Set([
  '8', '32', '38', 'mobility-open-book-rotations', 'mobility-knee-to-wall', 'mobility-downward-dog-heel-pumps',
  'mobility-90-90-hip-switches', 'mobility-elephant-walks', 'mobility-wall-angels', 'mobility-towel-shoulder-pass-through',
]);
const autoWarmupsClearedKey = 'workout-buddy-auto-warmups-cleared';
const autoWarmupsCleared = () => {
  try { return localStorage.getItem(autoWarmupsClearedKey) === 'true'; } catch { return true; }
};
const markAutoWarmupsCleared = () => {
  try { localStorage.setItem(autoWarmupsClearedKey, 'true'); } catch { /* storage off: nothing to remember */ }
};

export const useExercises = () => {
  const { items, isLoading, error, load, create, update, remove, restore, getById } =
    useIndexedDBCollection<Exercise>({
      getAll: getAllExercisesFromDB,
      save: saveExerciseToDB,
      remove: deleteExerciseFromDB,
      bulkSave: bulkSaveExercisesToDB,
      defaults: exerciseList,
      seedKey: 'exercises',
      seedUpdates: (stored, defaults) => {
        const clearAutoWarmups = !autoWarmupsCleared();
        if (clearAutoWarmups) markAutoWarmupsCleared();
        const defaultsById = new Map(defaults.map(item => [item.id, item]));
        return stored.flatMap(item => {
          const replacement = defaultsById.get(item.id);
          if (replacement?.imageUrl && courseExerciseIds.has(item.id) && !item.imageUrl && !item.deletedAt) {
            return [{ ...item, imageUrl: replacement.imageUrl, updatedAt: new Date().toISOString() }];
          }
          if (replacement?.instructions && !item.deletedAt
            && revisedInstructions[item.id] !== undefined && item.instructions === revisedInstructions[item.id]) {
            return [{ ...item, instructions: replacement.instructions, updatedAt: new Date().toISOString() }];
          }
          if (clearAutoWarmups && autoTaggedWarmupIds.has(item.id) && item.warmup && !item.deletedAt) {
            return [{ ...item, warmup: false, updatedAt: new Date().toISOString() }];
          }
          const publicPhoto = replacement?.imageUrl?.startsWith('private-exercise:')
            ? `/exercises/${replacement.imageUrl.slice('private-exercise:'.length)}`
            : undefined;
          return replacement
            && (item.imageUrl === legacySeedImages[item.id] || item.imageUrl === publicPhoto)
            && !item.deletedAt
            ? [{ ...replacement, updatedAt: new Date().toISOString() }]
            : [];
        });
      },
      errorMessage: 'Failed to load exercises'
    });

  const createUniqueExercise = async (data: Omit<Exercise, 'id'>): Promise<Exercise> => {
    const duplicate = items.find(exercise => exerciseNamesConflict(exercise, data));
    if (duplicate) throw new Error(`An exercise named "${duplicate.name}" already exists.`);
    return create(data);
  };

  const updateUniqueExercise = async (
    id: string,
    updates: Partial<Exercise>,
  ): Promise<Exercise | null> => {
    const current = items.find(exercise => exercise.id === id);
    if (!current) return null;
    const candidate = { ...current, ...updates };
    const duplicate = items.find(exercise => exercise.id !== id && exerciseNamesConflict(exercise, candidate));
    if (duplicate) throw new Error(`An exercise named "${duplicate.name}" already exists.`);
    return update(id, updates);
  };

  return {
    exercises: items,
    isLoading,
    error,
    createExercise: createUniqueExercise,
    updateExercise: updateUniqueExercise,
    deleteExercise: remove,
    restoreExercise: restore,
    getExerciseById: getById,
    refreshExercises: load
  };
};

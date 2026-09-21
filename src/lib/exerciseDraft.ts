import { DBSchema, openDB } from 'idb';

interface ExerciseDraftDB extends DBSchema {
  drafts: { key: string; value: { key: string; values: unknown; savedAt: string } };
}

const db = () => openDB<ExerciseDraftDB>('workout-buddy-form-drafts', 1, {
  upgrade(database) { database.createObjectStore('drafts', { keyPath: 'key' }); },
});

export const exerciseFormDraftKey = (exerciseId?: string) => `exercise:${exerciseId ?? 'new'}`;
export const readExerciseFormDraft = async (exerciseId?: string): Promise<unknown | null> =>
  (await (await db()).get('drafts', exerciseFormDraftKey(exerciseId)))?.values ?? null;
export const saveExerciseFormDraft = async (exerciseId: string | undefined, values: unknown): Promise<void> => {
  await (await db()).put('drafts', { key: exerciseFormDraftKey(exerciseId), values, savedAt: new Date().toISOString() });
  await navigator.storage?.persist?.().catch(() => false);
};
export const deleteExerciseFormDraft = async (exerciseId?: string): Promise<void> => {
  await (await db()).delete('drafts', exerciseFormDraftKey(exerciseId));
};

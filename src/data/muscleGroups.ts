export interface MuscleGroup {
  id: string;
  name: string;
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // reserved for self-hosted sync; local deletes don't set this yet
}

// Ids for these starter groups intentionally equal their display name.
// That's exactly what Exercise.muscleGroups already stored as plain
// strings before this became its own editable, syncable collection, so
// existing exercises keep matching these ids with no data migration.
// User-created groups get a generated id instead (see useIndexedDBCollection),
// which is what makes renaming one safe: the id an exercise references never
// changes, only the name displayed for it.
export const defaultMuscleGroups: MuscleGroup[] = [
  { id: 'Chest', name: 'Chest' },
  { id: 'Back', name: 'Back' },
  { id: 'Shoulders', name: 'Shoulders' },
  { id: 'Biceps', name: 'Biceps' },
  { id: 'Triceps', name: 'Triceps' },
  { id: 'Forearms', name: 'Forearms' },
  { id: 'Core', name: 'Core' },
  { id: 'Glutes', name: 'Glutes' },
  { id: 'Quadriceps', name: 'Quadriceps' },
  { id: 'Hamstrings', name: 'Hamstrings' },
  { id: 'Calves', name: 'Calves' },
  { id: 'Full Body', name: 'Full Body' },
];

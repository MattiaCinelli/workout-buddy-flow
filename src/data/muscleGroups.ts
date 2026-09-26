// Five fixed body regions every muscle group belongs to. Fixed in code
// rather than a synced collection: they are the stable top level that
// keeps the user-editable muscle list from sprawling. An exercise tagged
// with a muscle counts toward its region automatically; `region:<id>` tags
// a region directly when the exact muscle doesn't matter.
export const MUSCLE_REGIONS = [
  { id: 'neck-back', name: 'Neck & Back' },
  { id: 'chest-shoulders', name: 'Chest & Shoulders' },
  { id: 'arms-hands', name: 'Arms & Hands' },
  { id: 'core-hips', name: 'Core & Hips' },
  { id: 'legs-feet', name: 'Legs & Feet' },
] as const;
export type MuscleRegionId = typeof MUSCLE_REGIONS[number]['id'];

export interface MuscleGroup {
  id: string;
  name: string;
  /** Missing on groups created before regions existed: shown as Unsorted. */
  region?: MuscleRegionId;
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // sync tombstone — set by useIndexedDBCollection on delete while a sync server is connected; offline deletes hard-remove the row instead
}

// Ids for these starter groups intentionally equal their display name.
// That's exactly what Exercise.muscleGroups already stored as plain
// strings before this became its own editable, syncable collection, so
// existing exercises keep matching these ids with no data migration.
// User-created groups get a generated id instead (see useIndexedDBCollection),
// which is what makes renaming one safe: the id an exercise references never
// changes, only the name displayed for it.
export const defaultMuscleGroups: MuscleGroup[] = [
  { id: 'Neck', name: 'Neck', region: 'neck-back' },
  { id: 'Back', name: 'Back', region: 'neck-back' },
  { id: 'Chest', name: 'Chest', region: 'chest-shoulders' },
  { id: 'Shoulders', name: 'Shoulders', region: 'chest-shoulders' },
  { id: 'Biceps', name: 'Biceps', region: 'arms-hands' },
  { id: 'Triceps', name: 'Triceps', region: 'arms-hands' },
  { id: 'Forearms', name: 'Forearms', region: 'arms-hands' },
  { id: 'Core', name: 'Core', region: 'core-hips' },
  { id: 'Hips', name: 'Hips', region: 'core-hips' },
  { id: 'Hip Flexors', name: 'Hip Flexors', region: 'core-hips' },
  { id: 'Glutes', name: 'Glutes', region: 'core-hips' },
  { id: 'Groin', name: 'Groin', region: 'core-hips' },
  { id: 'Inner Thighs', name: 'Inner Thighs', region: 'core-hips' },
  { id: 'Quadriceps', name: 'Quadriceps', region: 'legs-feet' },
  { id: 'Hamstrings', name: 'Hamstrings', region: 'legs-feet' },
  { id: 'Calves', name: 'Calves', region: 'legs-feet' },
  { id: 'Ankles', name: 'Ankles', region: 'legs-feet' },
  // Belongs to every region rather than one — see src/lib/muscleRegions.ts.
  { id: 'Full Body', name: 'Full Body' },
];

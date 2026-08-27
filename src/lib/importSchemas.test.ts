import { describe, expect, it } from 'vitest';
import {
  checkExerciseReferences, exerciseImportSchema, validateImportCollection, workoutImportSchema,
} from './importSchemas';

const goodExercise = { id: 'e1', name: 'Squat', category: 'strength', muscleGroups: [], difficulty: 'beginner' };
const goodWorkout = {
  id: 'w1', date: '2026-01-01', title: 'Legs', duration: 30, category: 'strength',
  sets: [{ exerciseId: 'e1', reps: 5 }],
};

describe('validateImportCollection', () => {
  it('keeps well-formed records and their unknown extra fields', () => {
    const { records, warnings } = validateImportCollection(
      'exercises', [{ ...goodExercise, futureField: 'kept' }], exerciseImportSchema,
    );
    expect(records).toEqual([{ ...goodExercise, futureField: 'kept' }]);
    expect(warnings).toEqual([]);
  });

  it('drops malformed records with a single summary warning', () => {
    const { records, warnings } = validateImportCollection(
      'workouts',
      [goodWorkout, { id: 'w2' /* missing everything else */ }, { title: 'no id' }],
      workoutImportSchema,
    );
    expect(records.map(r => r.id)).toEqual(['w1']);
    expect(warnings).toEqual(['workouts: skipped 2 records with an unexpected shape.']);
  });

  it('drops same-id duplicates and warns per duplicate', () => {
    const { records, warnings } = validateImportCollection(
      'exercises', [goodExercise, { ...goodExercise, name: 'Squat 2' }], exerciseImportSchema,
    );
    expect(records).toHaveLength(1);
    expect(warnings).toEqual(['exercises: skipped a duplicate id (e1).']);
  });

  it('tolerates a non-array input', () => {
    expect(validateImportCollection('exercises', null, exerciseImportSchema)).toEqual({ records: [], warnings: [] });
  });
});

describe('checkExerciseReferences', () => {
  it('warns about set exerciseIds not present in the imported exercises', () => {
    const warnings = checkExerciseReferences(['e1'], [
      { label: 'Workout "A"', sets: [{ exerciseId: 'e1' }, { exerciseId: 'ghost' }, { exerciseId: 'ghost' }] },
      { label: 'Workout "B"', sets: [{ exerciseId: 'e1' }] },
    ]);
    expect(warnings).toEqual(['Workout "A": references 1 exercise not in the file.']);
  });
});

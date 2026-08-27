import { describe, expect, it } from 'vitest';
import {
  buildExerciseShare, buildWorkoutShare, importShare, parseShare, summarizeShareImport,
  ShareImportDeps, WorkoutBuddyShare,
} from './backup';
import { Exercise } from '@/data/exercises';
import { WorkoutEntry } from '@/data/workoutHistory';
import { MuscleGroup } from '@/data/muscleGroups';

const exercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'ex-row', name: 'Single-arm Row', category: 'strength', muscleGroups: ['Back'],
  difficulty: 'beginner', logType: 'reps', ...overrides,
});

const workout = (overrides: Partial<WorkoutEntry> = {}): WorkoutEntry => ({
  id: 'w-1', date: '2026-01-01T00:00:00.000Z', title: 'Pull Day', duration: 30, category: 'strength',
  sets: [{ exerciseId: 'ex-row', reps: 10 }], ...overrides,
});

const groups: MuscleGroup[] = [
  { id: 'Back', name: 'Back' }, { id: 'Biceps', name: 'Biceps' }, { id: 'grip-xyz', name: 'Grip' },
];

// A create-fn pair that hands back deterministic ids and records what it was asked to make.
const makeDeps = (existing: { exercises?: Exercise[]; muscleGroups?: MuscleGroup[] } = {}) => {
  const createdExercises: Exercise[] = [];
  const createdWorkouts: WorkoutEntry[] = [];
  const createdGroups: MuscleGroup[] = [];
  let counter = 0;
  const deps: ShareImportDeps = {
    exercises: existing.exercises ?? [],
    muscleGroups: existing.muscleGroups ?? [],
    createExercise: async data => {
      const item = { ...data, id: `new-ex-${counter++}` } as Exercise;
      createdExercises.push(item);
      return item;
    },
    createWorkout: async data => {
      const item = { ...data, id: `new-w-${counter++}` } as WorkoutEntry;
      createdWorkouts.push(item);
      return item;
    },
    createMuscleGroup: async data => {
      const item = { ...data, id: `new-mg-${counter++}` } as MuscleGroup;
      createdGroups.push(item);
      return item;
    },
  };
  return { deps, createdExercises, createdWorkouts, createdGroups };
};

describe('buildWorkoutShare', () => {
  it('bundles only the exercises the sets reference and only their muscle groups', () => {
    const exercises = [exercise(), exercise({ id: 'ex-curl', name: 'Curl', muscleGroups: ['Biceps'] })];
    const share = buildWorkoutShare(workout(), exercises, groups);
    expect(share.kind).toBe('workout');
    expect(share.data.exercises.map(item => item.id)).toEqual(['ex-row']);
    expect(share.data.muscleGroups.map(item => item.id)).toEqual(['Back']);
    expect(share.data.workouts).toHaveLength(1);
  });
});

describe('buildExerciseShare', () => {
  it('bundles the exercise and the muscle groups it is tagged with', () => {
    const share = buildExerciseShare(exercise({ muscleGroups: ['Back', 'grip-xyz'] }), groups);
    expect(share.kind).toBe('exercise');
    expect(share.data.workouts).toHaveLength(0);
    expect(share.data.muscleGroups.map(item => item.name).sort()).toEqual(['Back', 'Grip']);
  });
});

describe('parseShare', () => {
  const valid = JSON.stringify(buildExerciseShare(exercise(), groups));

  it('accepts a well-formed share file', () => {
    expect(parseShare(valid).data.format).toBe('workout-buddy-share');
  });

  it('rejects a full backup with a pointed message', () => {
    const backup = JSON.stringify({ format: 'workout-buddy-backup', version: 1, data: {} });
    expect(() => parseShare(backup)).toThrow(/Restore Backup/);
  });

  it('rejects unrelated JSON and non-JSON', () => {
    expect(() => parseShare('{"hello":1}')).toThrow(/not a shared Workout Buddy/);
    expect(() => parseShare('not json')).toThrow(/valid JSON/);
  });

  it('rejects a share that carries nothing usable', () => {
    const empty = JSON.stringify({
      format: 'workout-buddy-share', version: 1, exportedAt: '', kind: 'exercise',
      data: { exercises: [], workouts: [], muscleGroups: [] },
    });
    expect(() => parseShare(empty)).toThrow(/nothing usable to import/);
  });

  it('rejects an oversized file before parsing', () => {
    expect(() => parseShare('x'.repeat(129 * 1024 * 1024))).toThrow(/too large/);
  });

  it('strips a non-image / dangerous imageUrl from an imported exercise', () => {
    const build = (url: string) => JSON.stringify({
      format: 'workout-buddy-share', version: 1, exportedAt: '', kind: 'exercise',
      data: { exercises: [{ ...exercise(), imageUrl: url }], workouts: [], muscleGroups: [] },
    });
    const img = (file: string) => parseShare(build(file)).data.data.exercises[0].imageUrl;
    expect(img('javascript:alert(1)')).toBeUndefined();
    expect(img('data:text/html,<script>')).toBeUndefined();
    expect(img('http://insecure/x.png')).toBeUndefined();
    expect(img('https://ok/x.png')).toBe('https://ok/x.png');
    expect(img('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('drops a malformed record with a warning instead of failing', () => {
    const file = JSON.stringify({
      format: 'workout-buddy-share', version: 1, exportedAt: '', kind: 'exercise',
      data: {
        exercises: [exercise(), { id: 42 /* not a string */ }, { id: 'ok2', name: 'X', category: 'strength', muscleGroups: [], difficulty: 'beginner' }],
        workouts: [], muscleGroups: [],
      },
    });
    const { data, warnings } = parseShare(file);
    expect(data.data.exercises.map(e => e.id)).toEqual(['ex-row', 'ok2']);
    expect(warnings.join(' ')).toMatch(/skipped 1 record/);
  });
});

describe('importShare', () => {
  it('creates missing muscle groups and exercises with fresh ids and remaps workout sets', async () => {
    const share = buildWorkoutShare(
      workout(), [exercise({ muscleGroups: ['grip-xyz'] })], groups,
    );
    const { deps, createdExercises, createdWorkouts, createdGroups } = makeDeps();

    const summary = await importShare(share, deps);

    expect(createdGroups.map(g => g.name)).toEqual(['Grip']);
    expect(createdExercises).toHaveLength(1);
    // the new exercise's muscle group id points at the freshly created group
    expect(createdExercises[0].muscleGroups).toEqual([createdGroups[0].id]);
    // the workout copy's set points at the freshly created exercise, not the old id
    expect(createdWorkouts[0].sets[0].exerciseId).toBe(createdExercises[0].id);
    expect(createdWorkouts[0].id).not.toBe('w-1');
    expect(summary).toEqual({ newExercises: 1, reusedExercises: 0, newMuscleGroups: 1, workouts: 1 });
  });

  it('reuses same-named exercises and muscle groups already in the library', async () => {
    const share = buildWorkoutShare(workout(), [exercise()], groups);
    const { deps, createdExercises, createdWorkouts } = makeDeps({
      exercises: [exercise({ id: 'mine-row', name: 'single-arm row' })],
      muscleGroups: [{ id: 'mine-back', name: 'Back' }],
    });

    const summary = await importShare(share, deps);

    expect(createdExercises).toHaveLength(0);
    expect(createdWorkouts[0].sets[0].exerciseId).toBe('mine-row');
    expect(summary).toEqual({ newExercises: 0, reusedExercises: 1, newMuscleGroups: 0, workouts: 1 });
  });

  it('drops favorite and re-stamps the date on an imported workout', async () => {
    const share = buildWorkoutShare(workout({ favorite: true }), [exercise()], groups);
    const { deps, createdWorkouts } = makeDeps({ exercises: [exercise()] });

    await importShare(share, deps);

    expect(createdWorkouts[0].favorite).toBeUndefined();
    expect(createdWorkouts[0].date).not.toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('summarizeShareImport', () => {
  it('counts new vs reused without mutating anything', () => {
    const share: WorkoutBuddyShare = buildWorkoutShare(
      workout({ sets: [{ exerciseId: 'ex-row', reps: 10 }, { exerciseId: 'ex-curl', reps: 10 }] }),
      [exercise(), exercise({ id: 'ex-curl', name: 'Curl', muscleGroups: ['Biceps'] })],
      groups,
    );
    const summary = summarizeShareImport(share, [exercise({ id: 'x', name: 'Single-arm Row' })], []);
    expect(summary).toEqual({ newExercises: 1, reusedExercises: 1, newMuscleGroups: 2, workouts: 1 });
  });
});

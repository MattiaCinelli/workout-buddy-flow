import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/data/exercises';
import type { MuscleGroup } from '@/data/muscleGroups';
import { exerciseMatchesSearchQuery, filterExerciseLibrary } from './exerciseLibrary';

const exercises: Exercise[] = [
  { id: '1', name: 'Back Squat', aliases: ['Barbell squat'], category: 'strength', muscleGroups: ['quads'], equipment: ['Barbell'], difficulty: 'intermediate' },
  { id: '2', name: 'Easy Run', category: 'cardio', muscleGroups: ['legs'], difficulty: 'beginner' },
  { id: '3', name: 'Pistol Squat', category: 'balance', muscleGroups: ['quads'], difficulty: 'advanced' },
  { id: '4', name: 'Neck Rolls', category: 'flexibility', warmup: true, muscleGroups: ['neck'], difficulty: 'beginner' },
  { id: '5', name: 'Leg Swings', category: 'flexibility', muscleGroups: ['region:legs-feet'], difficulty: 'beginner' },
];
const groups: MuscleGroup[] = [
  { id: 'quads', name: 'Quadriceps', region: 'legs-feet' },
  { id: 'legs', name: 'Full Body' },
  { id: 'neck', name: 'Neck', region: 'neck-back' },
];
const filter = (overrides: Partial<Parameters<typeof filterExerciseLibrary>[1]>) => filterExerciseLibrary(
  exercises,
  { searchQuery: '', muscleGroupIds: [], equipment: [], category: 'all', difficulty: 'all', ...overrides },
  groups,
);

describe('filterExerciseLibrary', () => {
  it('filters warm-ups by their tag while they keep their own category', () => {
    expect(filter({ category: 'warmup' }).map(item => item.id)).toEqual(['4']);
    expect(filter({ category: 'flexibility' }).map(item => item.id)).toEqual(['4', '5']);
    expect(filter({ searchQuery: 'warm-up' }).map(item => item.id)).toEqual(['4']);
    expect(filter({ searchQuery: 'warmup' }).map(item => item.id)).toEqual(['4']);
  });

  it('combines muscle group, category and difficulty filters', () => {
    expect(filter({ muscleGroupIds: ['quads'], category: 'strength', difficulty: 'intermediate' }).map(item => item.id)).toEqual(['1']);
    expect(filter({ muscleGroupIds: ['quads'], category: 'strength', difficulty: 'advanced' })).toEqual([]);
  });

  it('matches a region filter by region tag or by any muscle in that region', () => {
    expect(filter({ muscleGroupIds: ['region:legs-feet'] }).map(item => item.id)).toEqual(['1', '3', '5']);
    expect(filter({ muscleGroupIds: ['region:neck-back'] }).map(item => item.id)).toEqual(['4']);
    // A specific muscle stays specific: the region-only tag doesn't match it.
    expect(filter({ muscleGroupIds: ['quads'] }).map(item => item.id)).toEqual(['1', '3']);
    expect(filter({ searchQuery: 'legs & feet' }).map(item => item.id)).toEqual(['1', '3', '5']);
  });

  it('searches aliases, muscle names and difficulty case-insensitively', () => {
    expect(filter({ searchQuery: 'BARBELL' }).map(item => item.id)).toEqual(['1']);
    expect(filter({ searchQuery: 'full body' }).map(item => item.id)).toEqual(['2']);
    expect(filter({ searchQuery: 'advanced' }).map(item => item.id)).toEqual(['3']);
  });

  it('filters and searches by equipment', () => {
    expect(filter({ equipment: ['Barbell'] }).map(item => item.id)).toEqual(['1']);
    expect(filter({ equipment: ['Dumbbells'] })).toEqual([]);
    expect(filter({ searchQuery: 'barbell' }).map(item => item.id)).toEqual(['1']);
  });
});

describe('exerciseMatchesSearchQuery', () => {
  const muscleName: MuscleGroup[] = [{ id: 'forearms', name: 'Wrists and Forearms', region: 'arms-hands' }];

  it('finds wrist exercises by either their name or target muscle group', () => {
    const namedExercise: Exercise = {
      id: 'wrist-name', name: 'Wrist Roll', category: 'flexibility', muscleGroups: [], difficulty: 'beginner',
    };
    const targetedExercise: Exercise = {
      id: 'wrist-target', name: 'Palm Lift', category: 'flexibility', muscleGroups: ['forearms'], difficulty: 'beginner',
    };

    expect(exerciseMatchesSearchQuery(namedExercise, 'wrist', muscleName)).toBe(true);
    expect(exerciseMatchesSearchQuery(targetedExercise, 'wrist', muscleName)).toBe(true);
  });

  it('finds exercises by required equipment', () => {
    const exercise: Exercise = {
      id: 'roller', name: 'Forearm Curl', category: 'strength', muscleGroups: ['forearms'],
      equipment: ['Wrist roller'], difficulty: 'intermediate',
    };

    expect(exerciseMatchesSearchQuery(exercise, 'roller', muscleName)).toBe(true);
  });
});

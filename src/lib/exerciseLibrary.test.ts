import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/data/exercises';
import { exerciseMatchesSearchQuery, filterExerciseLibrary } from './exerciseLibrary';

const exercises: Exercise[] = [
  { id: '1', name: 'Back Squat', aliases: ['Barbell squat'], category: 'strength', muscleGroups: ['quads'], equipment: ['Barbell'], difficulty: 'intermediate' },
  { id: '2', name: 'Easy Run', category: 'cardio', muscleGroups: ['legs'], difficulty: 'beginner' },
  { id: '3', name: 'Pistol Squat', category: 'balance', muscleGroups: ['quads'], difficulty: 'advanced' },
];
const names: Record<string, string> = { quads: 'Quadriceps', legs: 'Full Body' };
const filter = (overrides: Partial<Parameters<typeof filterExerciseLibrary>[1]>) => filterExerciseLibrary(
  exercises,
  { searchQuery: '', muscleGroupIds: [], equipment: [], category: 'all', difficulty: 'all', ...overrides },
  id => names[id] ?? id,
);

describe('filterExerciseLibrary', () => {
  it('combines muscle group, category and difficulty filters', () => {
    expect(filter({ muscleGroupIds: ['quads'], category: 'strength', difficulty: 'intermediate' }).map(item => item.id)).toEqual(['1']);
    expect(filter({ muscleGroupIds: ['quads'], category: 'strength', difficulty: 'advanced' })).toEqual([]);
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
  const wristNames: Record<string, string> = { forearms: 'Wrists and Forearms' };
  const muscleName = (id: string) => wristNames[id] ?? id;

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

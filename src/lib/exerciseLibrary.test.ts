import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/data/exercises';
import { filterExerciseLibrary } from './exerciseLibrary';

const exercises: Exercise[] = [
  { id: '1', name: 'Back Squat', aliases: ['Barbell squat'], category: 'strength', muscleGroups: ['quads'], difficulty: 'intermediate' },
  { id: '2', name: 'Easy Run', category: 'cardio', muscleGroups: ['legs'], difficulty: 'beginner' },
  { id: '3', name: 'Pistol Squat', category: 'balance', muscleGroups: ['quads'], difficulty: 'advanced' },
];
const names: Record<string, string> = { quads: 'Quadriceps', legs: 'Full Body' };
const filter = (overrides: Partial<Parameters<typeof filterExerciseLibrary>[1]>) => filterExerciseLibrary(
  exercises,
  { searchQuery: '', muscleGroupIds: [], category: 'all', difficulty: 'all', ...overrides },
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
});

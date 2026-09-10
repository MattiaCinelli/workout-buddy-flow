import { describe, expect, it } from 'vitest';
import { exerciseMatchesNameQuery, exerciseNamesOverlap, normalizeExerciseAliases } from './exerciseAliases';

describe('exercise aliases', () => {
  it('trims, deduplicates, and removes the canonical name', () => {
    expect(normalizeExerciseAliases(' RDL, Romanian deadlift\nrdl, Deadlift ', 'Romanian Deadlift'))
      .toEqual(['RDL', 'Deadlift']);
  });

  it('matches both canonical and alternative names', () => {
    const exercise = { name: 'Romanian Deadlift', aliases: ['RDL', 'Stiff-leg deadlift'] };
    expect(exerciseMatchesNameQuery(exercise, 'romanian')).toBe(true);
    expect(exerciseMatchesNameQuery(exercise, 'stiff')).toBe(true);
    expect(exerciseMatchesNameQuery(exercise, 'bench')).toBe(false);
  });

  it('detects collisions between a name and another exercise alias', () => {
    expect(exerciseNamesOverlap(
      { name: 'Romanian Deadlift', aliases: ['RDL'] },
      { name: 'RDL', aliases: [] },
    )).toBe(true);
  });
});

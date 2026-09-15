import { describe, expect, it } from 'vitest';
import type { Exercise } from '@/data/exercises';
import type { WorkoutEntry } from '@/data/workoutHistory';
import { workoutContainsExerciseQuery } from './workoutSearch';

const exercises: Exercise[] = [{
  id: 'rdl', name: 'Romanian Deadlift', aliases: ['RDL'], category: 'strength', muscleGroups: [], difficulty: 'intermediate',
  variations: [{ id: 'single-leg', name: 'Single-leg RDL', difficulty: 'advanced' }],
}];
const workout: WorkoutEntry = { id: 'w', title: 'Leg day', date: '2026-01-01', duration: 20, category: 'strength', sets: [{ exerciseId: 'rdl' }] };

describe('workoutContainsExerciseQuery', () => {
  it('matches canonical names, alternative names and variation names', () => {
    expect(workoutContainsExerciseQuery(workout, exercises, 'Romanian')).toBe(true);
    expect(workoutContainsExerciseQuery(workout, exercises, 'rdl')).toBe(true);
    expect(workoutContainsExerciseQuery(workout, exercises, 'single-leg')).toBe(true);
  });

  it('does not match exercises absent from the workout', () => {
    expect(workoutContainsExerciseQuery({ sets: [] }, exercises, 'RDL')).toBe(false);
  });
});

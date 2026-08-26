import { describe, expect, it } from 'vitest';
import { buildWorkoutSteps } from './workoutRuntime';
import { WorkoutEntry } from '@/data/workoutHistory';
import { Exercise } from '@/data/exercises';

const baseWorkout: Omit<WorkoutEntry, 'sets'> = {
  id: 'w-1', date: '2026-01-01', title: 'Test', duration: 10, category: 'strength',
};

const repsExercise: Exercise = {
  id: 'e-reps', name: 'Push-ups', category: 'strength', muscleGroups: [], difficulty: 'beginner',
  logType: 'reps', secondsPerRep: 2,
};

const timeExercise: Exercise = {
  id: 'e-time', name: 'Plank', category: 'strength', muscleGroups: [], difficulty: 'beginner',
  logType: 'time',
};

describe('buildWorkoutSteps', () => {
  it('leads with a 10-second "get in position" prep step before the first exercise', () => {
    const workout: WorkoutEntry = { ...baseWorkout, sets: [{ exerciseId: 'e-reps', reps: 10 }] };
    const steps = buildWorkoutSteps(workout, [repsExercise]);
    expect(steps[0]).toMatchObject({ type: 'rest', kind: 'prep', duration: 10 });
  });

  it('synthesizes a countdown duration for a reps-based set from the exercise secondsPerRep', () => {
    const workout: WorkoutEntry = { ...baseWorkout, sets: [{ exerciseId: 'e-reps', reps: 10 }] };
    const steps = buildWorkoutSteps(workout, [repsExercise]);
    expect(steps[1]).toMatchObject({ type: 'exercise', reps: 10, duration: 20, secondsPerRep: 2 });
  });

  it('falls back to the default 3 seconds per rep when the exercise has none set', () => {
    const workout: WorkoutEntry = { ...baseWorkout, sets: [{ exerciseId: 'unknown-exercise', reps: 4 }] };
    const steps = buildWorkoutSteps(workout, []);
    expect(steps[1]).toMatchObject({ duration: 12, secondsPerRep: 3 });
  });

  it('leaves a time-based set duration untouched and does not stamp secondsPerRep', () => {
    const workout: WorkoutEntry = { ...baseWorkout, sets: [{ exerciseId: 'e-time', duration: 45 }] };
    const steps = buildWorkoutSteps(workout, [timeExercise]);
    expect(steps[1]).toMatchObject({ type: 'exercise', duration: 45 });
    expect(steps[1].secondsPerRep).toBeUndefined();
  });

  it('defaults rest between different exercises to 30 seconds when nothing is specified', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout,
      sets: [{ exerciseId: 'e-reps', reps: 5 }, { exerciseId: 'e-time', duration: 30 }],
    };
    const steps = buildWorkoutSteps(workout, [repsExercise, timeExercise]);
    expect(steps[2]).toMatchObject({ type: 'rest', kind: 'rest', duration: 30 });
  });

  it('defaults rest between two sets of the SAME exercise to 30 seconds too', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout,
      sets: [{ exerciseId: 'e-reps', reps: 5 }, { exerciseId: 'e-reps', reps: 5 }],
    };
    const steps = buildWorkoutSteps(workout, [repsExercise]);
    expect(steps[2]).toMatchObject({ type: 'rest', duration: 30 });
  });

  it('an explicit restAfter on the set overrides both defaults', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout,
      sets: [{ exerciseId: 'e-reps', reps: 5, restAfter: 90 }, { exerciseId: 'e-time', duration: 30 }],
    };
    const steps = buildWorkoutSteps(workout, [repsExercise, timeExercise]);
    expect(steps[2]).toMatchObject({ type: 'rest', duration: 90 });
  });
});

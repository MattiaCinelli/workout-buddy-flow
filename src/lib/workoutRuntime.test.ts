import { describe, expect, it } from 'vitest';
import {
  buildWorkoutSteps, isSelfPacedStep, remainingSeconds, restKindLabel, stepClockSeconds,
  stepStartAnnouncement, workoutDurationMinutes, workoutDurationSeconds, type WorkoutStep,
} from './workoutRuntime';
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

  it('falls back to the default 5 seconds per rep when the exercise has none set', () => {
    const workout: WorkoutEntry = { ...baseWorkout, sets: [{ exerciseId: 'unknown-exercise', reps: 4 }] };
    const steps = buildWorkoutSteps(workout, []);
    expect(steps[1]).toMatchObject({ duration: 20, secondsPerRep: 5 });
  });

  it('carries the warm-up and AMRAP flags onto the exercise step', () => {
    const workout: WorkoutEntry = { ...baseWorkout, sets: [
      { exerciseId: 'e-reps', reps: 10, warmup: true },
      { exerciseId: 'e-reps', reps: 8, amrap: true },
    ] };
    const steps = buildWorkoutSteps(workout, [repsExercise]);
    expect(steps[1]).toMatchObject({ type: 'exercise', warmup: true });
    expect(steps[3]).toMatchObject({ type: 'exercise', amrap: true });
  });

  it('leaves a time-based set duration untouched and does not stamp secondsPerRep', () => {
    const workout: WorkoutEntry = { ...baseWorkout, sets: [{ exerciseId: 'e-time', duration: 45 }] };
    const steps = buildWorkoutSteps(workout, [timeExercise]);
    expect(steps[1]).toMatchObject({ type: 'exercise', duration: 45 });
    expect(steps[1].secondsPerRep).toBeUndefined();
  });

  it('defaults rest between different exercises to 15 seconds when nothing is specified', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout,
      sets: [{ exerciseId: 'e-reps', reps: 5 }, { exerciseId: 'e-time', duration: 30 }],
    };
    const steps = buildWorkoutSteps(workout, [repsExercise, timeExercise]);
    expect(steps[2]).toMatchObject({ type: 'rest', kind: 'rest', duration: 15, changesExercise: true });
  });

  it('tags a rest as changesExercise only when the next set is a different exercise', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout,
      sets: [
        { exerciseId: 'e-reps', reps: 5 },
        { exerciseId: 'e-reps', reps: 5 },   // same exercise -> between-sets rest
        { exerciseId: 'e-time', duration: 30 }, // different -> between-exercises rest
      ],
    };
    const steps = buildWorkoutSteps(workout, [repsExercise, timeExercise]);
    expect(steps[2]).toMatchObject({ kind: 'rest', changesExercise: false });
    expect(steps[4]).toMatchObject({ kind: 'rest', changesExercise: true });
  });

  it('defaults rest between two sets of the SAME exercise to 5 seconds — shorter than between exercises', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout,
      sets: [{ exerciseId: 'e-reps', reps: 5 }, { exerciseId: 'e-reps', reps: 5 }],
    };
    const steps = buildWorkoutSteps(workout, [repsExercise]);
    expect(steps[2]).toMatchObject({ type: 'rest', duration: 5 });
  });

  it('respects a custom restBetweenSets/restBetweenExercises set on the workout', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout, restBetweenSets: 8, restBetweenExercises: 20,
      sets: [{ exerciseId: 'e-reps', reps: 5 }, { exerciseId: 'e-reps', reps: 5 }, { exerciseId: 'e-time', duration: 30 }],
    };
    const steps = buildWorkoutSteps(workout, [repsExercise, timeExercise]);
    expect(steps[2]).toMatchObject({ duration: 8 }); // between the two same-exercise sets
    expect(steps[4]).toMatchObject({ duration: 20 }); // between the two different exercises
  });

  it('moves directly to the next set when same-exercise rest is zero', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout, restBetweenSets: 0,
      sets: [{ exerciseId: 'e-reps', reps: 5 }, { exerciseId: 'e-reps', reps: 5 }],
    };
    const steps = buildWorkoutSteps(workout, [repsExercise]);
    expect(steps.map(item => item.type)).toEqual(['rest', 'exercise', 'exercise']);
    expect(steps.some(item => item.kind === 'rest')).toBe(false);
  });

  it('moves directly to the next exercise when between-exercise rest is zero', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout, restBetweenExercises: 0,
      sets: [{ exerciseId: 'e-reps', reps: 5 }, { exerciseId: 'e-time', duration: 30 }],
    };
    const steps = buildWorkoutSteps(workout, [repsExercise, timeExercise]);
    expect(steps.map(item => item.type)).toEqual(['rest', 'exercise', 'exercise']);
    expect(steps.some(item => item.kind === 'rest')).toBe(false);
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

describe('workoutDurationSeconds', () => {
  it('calculates configured exercise and rest time without the get-ready pause', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout,
      restBetweenSets: 0,
      restBetweenExercises: 0,
      sets: [
        { exerciseId: 'e-time', duration: 45 },
        { exerciseId: 'e-time', duration: 30 },
        { exerciseId: 'e-time', duration: 30 },
        { exerciseId: 'e-time', duration: 30 },
        { exerciseId: 'e-time', duration: 30 },
      ],
    };

    expect(workoutDurationSeconds(workout, [timeExercise])).toBe(165);
  });

  it('includes configured non-zero rests and derives rep time from the exercise', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout,
      restBetweenExercises: 15,
      sets: [{ exerciseId: 'e-reps', reps: 10 }, { exerciseId: 'e-time', duration: 30 }],
    };

    expect(workoutDurationSeconds(workout, [repsExercise, timeExercise])).toBe(65);
  });
});

describe('workoutDurationMinutes', () => {
  it('stores the calculated runtime as whole minutes, rounded up', () => {
    const workout: WorkoutEntry = {
      ...baseWorkout, restBetweenSets: 0, restBetweenExercises: 0,
      sets: [{ exerciseId: 'e-time', duration: 165 }],
    };
    expect(workoutDurationMinutes(workout, [timeExercise])).toBe(3);
  });

  it('keeps an empty workout at zero minutes', () => {
    expect(workoutDurationMinutes({ ...baseWorkout, sets: [] }, [])).toBe(0);
  });
});

// --- presentation-layer step helpers -------------------------------------

const step = (over: Partial<WorkoutStep>): WorkoutStep => ({ type: 'exercise', ...over });

describe('isSelfPacedStep', () => {
  it('is true only for a reps-based exercise (secondsPerRep set)', () => {
    expect(isSelfPacedStep(step({ type: 'exercise', reps: 10, secondsPerRep: 3 }))).toBe(true);
  });

  it('is false for a timed exercise, a rest, and undefined', () => {
    expect(isSelfPacedStep(step({ type: 'exercise', duration: 40 }))).toBe(false);
    expect(isSelfPacedStep(step({ type: 'rest', kind: 'rest', duration: 30 }))).toBe(false);
    expect(isSelfPacedStep(undefined)).toBe(false);
  });
});

describe('stepClockSeconds', () => {
  it('is 0 for a self-paced reps exercise — no countdown, no auto-advance', () => {
    expect(stepClockSeconds(step({ type: 'exercise', reps: 10, secondsPerRep: 3, duration: 30 }))).toBe(0);
  });

  it('is the duration for a timed exercise and for a rest', () => {
    expect(stepClockSeconds(step({ type: 'exercise', duration: 40 }))).toBe(40);
    expect(stepClockSeconds(step({ type: 'rest', kind: 'prep', duration: 10 }))).toBe(10);
  });
});

describe('stepStartAnnouncement', () => {
  it('announces "Begin" without a direction and names every supported direction', () => {
    expect(stepStartAnnouncement(step({ type: 'exercise' }))).toBe('Begin');
    expect(stepStartAnnouncement(step({ type: 'exercise', direction: 'left' }))).toBe('Begin left side');
    expect(stepStartAnnouncement(step({ type: 'exercise', direction: 'right' }))).toBe('Begin right side');
    expect(stepStartAnnouncement(step({ type: 'exercise', direction: 'alternate' }))).toBe('Begin alternating sides');
    expect(stepStartAnnouncement(step({ type: 'exercise', direction: 'forward' }))).toBe('Begin forward');
    expect(stepStartAnnouncement(step({ type: 'exercise', direction: 'backward' }))).toBe('Begin backward');
  });

  it('announces the right cue for each kind of rest', () => {
    expect(stepStartAnnouncement(step({ type: 'rest', kind: 'prep' }))).toBe('Get ready');
    expect(stepStartAnnouncement(step({ type: 'rest', kind: 'switch' }))).toBe('Change side');
    expect(stepStartAnnouncement(step({ type: 'rest', kind: 'rest' }))).toBe('Rest');
  });

  it('distinguishes a between-exercises rest, and names the next exercise when given', () => {
    const between = step({ type: 'rest', kind: 'rest', changesExercise: true });
    expect(stepStartAnnouncement(between)).toBe('Rest, changing exercise');
    expect(stepStartAnnouncement(between, 'Plank')).toBe('Rest, changing exercise. Next up: Plank');
  });
});

describe('restKindLabel', () => {
  it('gives a short screen-free label per rest kind', () => {
    expect(restKindLabel(step({ type: 'rest', kind: 'prep' }))).toBe('Get ready');
    expect(restKindLabel(step({ type: 'rest', kind: 'switch' }))).toBe('Change side');
    expect(restKindLabel(step({ type: 'rest', kind: 'rest' }))).toBe('Rest');
    expect(restKindLabel(step({ type: 'rest', kind: 'rest', changesExercise: true }))).toBe('Rest — next exercise');
  });
});

describe('remainingSeconds', () => {
  it('rounds up and never goes negative', () => {
    expect(remainingSeconds(10_000, 4_100)).toBe(6);
    expect(remainingSeconds(10_000, 10_000)).toBe(0);
    expect(remainingSeconds(10_000, 12_000)).toBe(0);
  });
});

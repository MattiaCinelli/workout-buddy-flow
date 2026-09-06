import { test, expect } from '../playwright-fixture';
import { buildWorkoutSteps, remainingSeconds } from '../src/lib/workoutRuntime';

test('workout runtime preserves interleaved circuit order and authored rest', () => {
  const steps = buildWorkoutSteps({ id: 'w', date: new Date().toISOString(), title: 'Circuit', duration: 10,
    category: 'mixed', restBetweenExercises: 90, sets: [
      { exerciseId: 'a', reps: 10, restAfter: 15 },
      { exerciseId: 'b', reps: 12, restAfter: 20 },
      { exerciseId: 'a', reps: 8 },
    ] });
  expect(steps.map(step => step.type === 'exercise' ? step.exerciseId : `rest:${step.duration}`))
    .toEqual(['rest:10', 'a', 'rest:15', 'b', 'rest:20', 'a']);
});

test('a unilateral exercise expands each set into left, switch pause, right', () => {
  const steps = buildWorkoutSteps(
    { id: 'w', date: new Date().toISOString(), title: 'Unilateral', duration: 10, category: 'strength',
      sets: [{ exerciseId: 'row', reps: 10 }, { exerciseId: 'row', reps: 10 }] },
    [{ id: 'row', name: 'Single-arm Row', category: 'strength', muscleGroups: [], difficulty: 'beginner',
      logType: 'reps', unilateral: true }],
  );
  expect(steps.map(step => step.type === 'exercise' ? `${step.exerciseId}:${step.direction}` : `${step.kind}:${step.duration}`))
    .toEqual(['prep:10', 'row:left', 'switch:5', 'row:right', 'rest:10', 'row:left', 'switch:5', 'row:right']);
});

test('explicit directional workout sets remain separate runtime sets', () => {
  const steps = buildWorkoutSteps(
    { id: 'w', date: new Date().toISOString(), title: 'Directions', duration: 10, category: 'strength',
      sets: [
        { exerciseId: 'row', reps: 10, direction: 'left' },
        { exerciseId: 'row', reps: 10, direction: 'right' },
      ] },
  );
  expect(steps.map(step => step.type === 'exercise' ? step.direction : step.kind))
    .toEqual(['prep', 'left', 'rest', 'right']);
});

test('deadline calculation catches up after background suspension', () => {
  expect(remainingSeconds(15_000, 10_100)).toBe(5);
  expect(remainingSeconds(15_000, 20_000)).toBe(0);
});

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
    .toEqual(['a', 'rest:15', 'b', 'rest:20', 'a']);
});

test('deadline calculation catches up after background suspension', () => {
  expect(remainingSeconds(15_000, 10_100)).toBe(5);
  expect(remainingSeconds(15_000, 20_000)).toBe(0);
});

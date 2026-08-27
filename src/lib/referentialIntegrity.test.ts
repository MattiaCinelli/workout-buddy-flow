import { describe, expect, it } from 'vitest';
import { checkExerciseDeletion, checkWorkoutDeletion } from './referentialIntegrity';
import { WorkoutEntry } from '@/data/workoutHistory';
import { WorkoutSession } from '@/data/workoutSessions';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';
import { Course } from '@/data/courses';

const workout = (overrides: Partial<WorkoutEntry> = {}): WorkoutEntry => ({
  id: 'w-1', date: '2026-01-01', title: 'Leg day', duration: 30, category: 'strength',
  sets: [{ exerciseId: 'squat' }], ...overrides,
});

const session = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's-1', workoutId: 'w-1', date: '2026-01-02', title: 'Leg day', duration: 30,
  plannedDuration: 30, category: 'strength', completedAt: '2026-01-02T00:00:00.000Z',
  sets: [{ exerciseId: 'squat' }], ...overrides,
});

describe('checkExerciseDeletion', () => {
  it('allows deletion when the exercise is unused', () => {
    const result = checkExerciseDeletion('squat', [], []);
    expect(result.blocked).toBe(false);
    expect(result.reason).toBe('');
  });

  it('blocks deletion when a workout template references it', () => {
    const result = checkExerciseDeletion('squat', [workout()], []);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('1 template set');
    expect(result.reason).not.toContain('completed set');
  });

  it('blocks deletion when completed session history references it', () => {
    const result = checkExerciseDeletion('squat', [], [session()]);
    expect(result.blocked).toBe(true);
    expect(result.reason).not.toContain('template set');
    expect(result.reason).toContain('1 completed set');
  });

  it('counts every matching set across multiple workouts', () => {
    const twoSetWorkout = workout({ sets: [{ exerciseId: 'squat' }, { exerciseId: 'squat' }] });
    const result = checkExerciseDeletion('squat', [twoSetWorkout, workout({ id: 'w-2', sets: [{ exerciseId: 'bench' }] })], []);
    expect(result.reason).toContain('2 template sets');
  });

  it('does not block deletion of an unrelated exercise', () => {
    const result = checkExerciseDeletion('bench', [workout()], [session()]);
    expect(result.blocked).toBe(false);
  });
});

describe('checkWorkoutDeletion', () => {
  const scheduledWorkout: ScheduledWorkout = {
    id: 'sw-1', workoutId: 'w-1', startDate: '2026-01-01', startTime: '09:00',
    recurrence: 'none', createdAt: '2026-01-01T00:00:00.000Z',
  };

  const course: Course = {
    id: 'c-1', title: 'Beginner program', createdAt: '2026-01-01T00:00:00.000Z',
    workouts: [{ id: 'cw-1', type: 'workout', workoutId: 'w-1', order: 0, week: 1, day: 1, completed: false }],
  };

  it('allows deletion when the workout is unused', () => {
    const result = checkWorkoutDeletion('w-1', [], [], []);
    expect(result.blocked).toBe(false);
  });

  it('blocks deletion when a calendar entry references it', () => {
    const result = checkWorkoutDeletion('w-1', [scheduledWorkout], [], []);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('scheduled 1 time');
    expect(result.reason).not.toContain('course item');
    expect(result.reason).not.toContain('completed session');
  });

  it('blocks deletion when a course item references it', () => {
    const result = checkWorkoutDeletion('w-1', [], [course], []);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('1 course item');
  });

  it('blocks deletion when completed session history references it', () => {
    const result = checkWorkoutDeletion('w-1', [], [], [session()]);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('1 completed session');
  });

  it('does not block deletion of an unrelated workout', () => {
    const result = checkWorkoutDeletion('w-2', [scheduledWorkout], [course], [session()]);
    expect(result.blocked).toBe(false);
  });

  it('blocks deletion of a favorited workout even with no other references', () => {
    const result = checkWorkoutDeletion('w-1', [], [], [], true);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('favorite');
  });

  it('does not block deletion when isFavorite is false', () => {
    const result = checkWorkoutDeletion('w-1', [], [], [], false);
    expect(result.blocked).toBe(false);
  });
});

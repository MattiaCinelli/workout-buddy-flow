/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';

// Each domain hook is mocked to return controllable data + spies. The
// referential-integrity rules themselves stay real (pure, already tested);
// these tests check that DataProvider actually wires the guard in.
const state = {
  exercises: [] as { id: string; name: string }[],
  workouts: [] as { id: string; favorite?: boolean; title?: string }[],
  sessions: [] as { workoutId?: string; sets?: { exerciseId: string }[] }[],
  scheduledWorkouts: [] as { workoutId: string }[],
  courses: [] as { workouts: { workoutId?: string }[] }[],
};
const { deleteExerciseRaw, deleteWorkoutRaw, updateWorkoutRaw, updateSessionRaw, scheduleWorkoutReminders, cancelWorkoutReminders } = vi.hoisted(() => ({
  deleteExerciseRaw: vi.fn(async (id: string) => ({ id })),
  deleteWorkoutRaw: vi.fn(async (id: string) => ({ id })),
  updateWorkoutRaw: vi.fn(async () => ({})),
  updateSessionRaw: vi.fn(async () => ({})),
  scheduleWorkoutReminders: vi.fn(async (_sw: unknown, _title: string) => {}),
  cancelWorkoutReminders: vi.fn(async (_id: string) => {}),
}));

vi.mock('@/hooks/useExercises', () => ({
  useExercises: () => ({
    exercises: state.exercises, isLoading: false, error: null,
    createExercise: vi.fn(), updateExercise: vi.fn(),
    deleteExercise: deleteExerciseRaw, getExerciseById: vi.fn(), refreshExercises: vi.fn(),
  }),
}));
vi.mock('@/hooks/useWorkouts', () => ({
  useWorkouts: () => ({
    workouts: state.workouts, isLoading: false, error: null,
    createWorkout: vi.fn(), updateWorkout: updateWorkoutRaw, deleteWorkout: deleteWorkoutRaw,
    clearAllWorkouts: vi.fn(), getWorkoutById: vi.fn(), fetchWorkoutById: vi.fn(), refreshWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/useScheduledWorkouts', () => ({
  useScheduledWorkouts: () => ({
    scheduledWorkouts: state.scheduledWorkouts, isLoading: false, error: null,
    createScheduledWorkout: vi.fn(async (d: unknown) => d), updateScheduledWorkout: vi.fn(async () => null),
    deleteScheduledWorkout: vi.fn(async (id: string) => ({ id })),
    getScheduledWorkoutsForRange: vi.fn(() => []), getScheduledWorkoutsForDate: vi.fn(() => []),
    refreshScheduledWorkouts: vi.fn(),
  }),
}));
vi.mock('@/hooks/useCourses', () => ({
  useCourses: () => ({
    courses: state.courses, isLoading: false, error: null,
    createCourse: vi.fn(), updateCourse: vi.fn(), deleteCourse: vi.fn(),
    startCourse: vi.fn(), restartCourse: vi.fn(), completeWorkoutInCourse: vi.fn(),
    uncompleteWorkoutInCourse: vi.fn(), getNextWorkoutInCourse: vi.fn(), getCourseById: vi.fn(),
    getCourseProgress: vi.fn(), refreshCourses: vi.fn(),
  }),
}));
vi.mock('@/hooks/useMuscleGroups', () => ({
  useMuscleGroups: () => ({
    muscleGroups: [], isLoading: false, error: null,
    createMuscleGroup: vi.fn(), updateMuscleGroup: vi.fn(), deleteMuscleGroup: vi.fn(), refreshMuscleGroups: vi.fn(),
  }),
}));
vi.mock('@/hooks/useBodyMetrics', () => ({
  useBodyMetrics: () => ({
    bodyMetrics: [], isLoading: false, error: null,
    createBodyMetric: vi.fn(), updateBodyMetric: vi.fn(), deleteBodyMetric: vi.fn(), refreshBodyMetrics: vi.fn(),
  }),
}));
vi.mock('@/hooks/useWorkoutSessions', () => ({
  useWorkoutSessions: () => ({
    sessions: state.sessions, isLoading: false, error: null,
    createSession: vi.fn(), updateSession: updateSessionRaw, deleteSession: vi.fn(),
    clearAllSessions: vi.fn(), refreshSessions: vi.fn(),
  }),
}));
vi.mock('@/lib/notifications', () => ({ scheduleWorkoutReminders, cancelWorkoutReminders }));

import { DataProvider, useData } from './DataContext';

const wrapper = ({ children }: { children: ReactNode }) => <DataProvider>{children}</DataProvider>;

beforeEach(() => {
  state.exercises = []; state.workouts = []; state.sessions = []; state.scheduledWorkouts = []; state.courses = [];
  vi.clearAllMocks();
});
afterEach(() => cleanup());

describe('DataContext', () => {
  it('useData throws when used outside the provider', () => {
    expect(() => renderHook(() => useData())).toThrow(/useData/);
  });

  it('deleteExercise is blocked while a workout still references it', async () => {
    state.workouts = [{ id: 'w1', sets: [{ exerciseId: 'e1' }] } as never];
    const { result } = renderHook(() => useData(), { wrapper });

    await expect(result.current.deleteExercise('e1')).rejects.toThrow();
    expect(deleteExerciseRaw).not.toHaveBeenCalled();
  });

  it('deleteExercise goes through when nothing references it', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await act(async () => { await result.current.deleteExercise('e1'); });
    expect(deleteExerciseRaw).toHaveBeenCalledWith('e1');
  });

  it('reconciles stored duplicate names and redirects their references to the built-in exercise', async () => {
    state.exercises = [
      { id: '10', name: 'Hamstring stretch' },
      { id: 'custom-copy', name: '  HAMSTRING STRETCH ' },
    ];
    state.workouts = [{ id: 'w1', sets: [{ exerciseId: 'custom-copy' }] } as never];
    state.sessions = [{
      id: 's1',
      sets: [{ exerciseId: 'custom-copy' }],
      actualSets: [{ exerciseId: 'custom-copy', setIndex: 0, completed: true }],
    } as never];

    renderHook(() => useData(), { wrapper });

    await vi.waitFor(() => expect(deleteExerciseRaw).toHaveBeenCalledWith('custom-copy'));
    expect(updateWorkoutRaw).toHaveBeenCalledWith('w1', {
      sets: [{ exerciseId: '10' }],
    });
    expect(updateSessionRaw).toHaveBeenCalledWith('s1', expect.objectContaining({
      sets: [{ exerciseId: '10' }],
      actualSets: [{ exerciseId: '10', setIndex: 0, completed: true }],
    }));
  });

  it('deleteWorkout is blocked for a favorite workout', async () => {
    state.workouts = [{ id: 'w1', favorite: true, title: 'Leg Day' }];
    const { result } = renderHook(() => useData(), { wrapper });

    await expect(result.current.deleteWorkout('w1')).rejects.toThrow();
    expect(deleteWorkoutRaw).not.toHaveBeenCalled();
  });

  it('deleteWorkout is blocked while a schedule references it', async () => {
    state.workouts = [{ id: 'w1', title: 'Leg Day' }];
    state.scheduledWorkouts = [{ workoutId: 'w1' }];
    const { result } = renderHook(() => useData(), { wrapper });

    await expect(result.current.deleteWorkout('w1')).rejects.toThrow();
  });

  it('deleteWorkout goes through for an unreferenced non-favorite', async () => {
    state.workouts = [{ id: 'w1', title: 'Leg Day' }];
    const { result } = renderHook(() => useData(), { wrapper });
    await act(async () => { await result.current.deleteWorkout('w1'); });
    expect(deleteWorkoutRaw).toHaveBeenCalledWith('w1');
  });

  it('creating a scheduled workout also schedules its reminder', async () => {
    state.workouts = [{ id: 'w1', title: 'Leg Day' }];
    const { result } = renderHook(() => useData(), { wrapper });
    await act(async () => { await result.current.createScheduledWorkout({ workoutId: 'w1' } as never); });
    expect(scheduleWorkoutReminders).toHaveBeenCalled();
  });

  it('deleting a scheduled workout cancels its reminder', async () => {
    const { result } = renderHook(() => useData(), { wrapper });
    await act(async () => { await result.current.deleteScheduledWorkout('s1'); });
    expect(cancelWorkoutReminders).toHaveBeenCalledWith('s1');
  });
});

/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';

// One in-memory table per store the hooks under test touch.
const { tables } = vi.hoisted(() => ({
  tables: {
    workouts: [] as Record<string, unknown>[],
    workoutSessions: [] as Record<string, unknown>[],
    scheduledWorkouts: [] as Record<string, unknown>[],
  },
}));

vi.mock('@/lib/db', () => ({
  getAllWorkoutsFromDB: async () => [...tables.workouts],
  saveWorkoutToDB: async () => {}, deleteWorkoutFromDB: async () => {},
  bulkSaveWorkoutsToDB: async () => {}, getWorkoutByIdFromDB: async () => undefined,
  getAllWorkoutSessionsFromDB: async () => [...tables.workoutSessions],
  saveWorkoutSessionToDB: async () => {}, deleteWorkoutSessionFromDB: async () => {},
  deleteAllWorkoutSessionsFromDB: async () => {},
  getAllScheduledWorkoutsFromDB: async () => [...tables.scheduledWorkouts],
  saveScheduledWorkoutToDB: async () => {}, deleteScheduledWorkoutFromDB: async () => {},
}));
vi.mock('@/lib/syncClient', () => ({ isConnected: () => false }));
// Keep seeding out of the way for workouts (it has defaults + seedKey).
vi.mock('@/data/workoutHistory', async (orig) => ({
  ...(await orig<typeof import('@/data/workoutHistory')>()), workoutHistory: [],
}));

import { useWorkouts } from './useWorkouts';
import { useWorkoutSessions } from './useWorkoutSessions';
import { useScheduledWorkouts } from './useScheduledWorkouts';

beforeEach(() => {
  tables.workouts = [];
  tables.workoutSessions = [];
  tables.scheduledWorkouts = [];
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('useWorkouts', () => {
  it('returns workouts sorted by date, newest first', async () => {
    tables.workouts = [
      { id: 'a', date: '2026-01-01', title: 'A' },
      { id: 'b', date: '2026-03-01', title: 'B' },
      { id: 'c', date: '2026-02-01', title: 'C' },
    ];
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workouts.map(w => w.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('useWorkoutSessions', () => {
  it('returns sessions sorted by completedAt, newest first', async () => {
    tables.workoutSessions = [
      { id: 'a', completedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', completedAt: '2026-05-01T00:00:00.000Z' },
      { id: 'c', completedAt: '2026-02-01T00:00:00.000Z' },
    ];
    const { result } = renderHook(() => useWorkoutSessions());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessions.map(s => s.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('useScheduledWorkouts', () => {
  it('expands a weekly recurrence across a date range', async () => {
    tables.scheduledWorkouts = [{
      id: 's1', workoutId: 'w1',
      startDate: '2026-03-02', startTime: '08:00',            // a Monday
      recurrence: 'weekly', recurrenceDays: ['monday'],
      createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
    }];
    const { result } = renderHook(() => useScheduledWorkouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const occurrences = result.current.getScheduledWorkoutsForRange(
      new Date('2026-03-01'), new Date('2026-03-31'),
    );
    // Mondays in March 2026: 2, 9, 16, 23, 30
    expect(occurrences).toHaveLength(5);
    expect(occurrences.every(o => o.workoutId === 'w1')).toBe(true);
  });

  it('getScheduledWorkoutsForDate returns only that day\'s occurrences', async () => {
    tables.scheduledWorkouts = [{
      id: 's1', workoutId: 'w1', startDate: '2026-03-02', startTime: '08:00',
      recurrence: 'none',
      createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z',
    }];
    const { result } = renderHook(() => useScheduledWorkouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getScheduledWorkoutsForDate(new Date('2026-03-02'))).toHaveLength(1);
    expect(result.current.getScheduledWorkoutsForDate(new Date('2026-03-03'))).toHaveLength(0);
  });
});

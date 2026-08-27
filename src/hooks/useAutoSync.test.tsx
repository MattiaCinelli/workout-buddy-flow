/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';

const isConnected = vi.fn(() => true);
const syncAll = vi.fn(async () => []);
vi.mock('@/lib/syncClient', () => ({ isConnected: () => isConnected(), syncAll: () => syncAll() }));
vi.mock('@/lib/diagnosticLog', () => ({ logDiagnostic: vi.fn() }));

const refreshers = Object.fromEntries(
  ['refreshExercises', 'refreshWorkouts', 'refreshScheduledWorkouts', 'refreshCourses',
    'refreshSessions', 'refreshMuscleGroups', 'refreshBodyMetrics'].map(k => [k, vi.fn(async () => {})]),
);
vi.mock('@/contexts/DataContext', () => ({ useData: () => refreshers }));

import { useAutoSync } from './useAutoSync';

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  vi.useFakeTimers();
  isConnected.mockReturnValue(true);
  syncAll.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  cleanup(); // unmount hooks so their interval + visibilitychange listener go away
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useAutoSync', () => {
  it('syncs immediately on mount when connected', async () => {
    renderHook(() => useAutoSync());
    await vi.advanceTimersByTimeAsync(0);
    expect(syncAll).toHaveBeenCalledTimes(1);
  });

  it('does nothing when not connected', async () => {
    isConnected.mockReturnValue(false);
    renderHook(() => useAutoSync());
    await vi.advanceTimersByTimeAsync(60_000);
    expect(syncAll).not.toHaveBeenCalled();
  });

  it('syncs again on the 30s interval', async () => {
    renderHook(() => useAutoSync());
    await vi.advanceTimersByTimeAsync(0);
    expect(syncAll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(syncAll).toHaveBeenCalledTimes(2);
  });

  it('backs off after a failure — the next 30s tick is skipped, a later one runs', async () => {
    syncAll.mockRejectedValueOnce(new Error('server down'));
    renderHook(() => useAutoSync());
    await vi.advanceTimersByTimeAsync(0); // mount sync -> fails, backoff ~60s
    expect(syncAll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000); // tick at 30s: still inside backoff window
    expect(syncAll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000); // tick at 60s: backoff elapsed
    expect(syncAll).toHaveBeenCalledTimes(2);
  });

  it('a return to foreground forces a sync even during backoff', async () => {
    syncAll.mockRejectedValueOnce(new Error('server down'));
    renderHook(() => useAutoSync());
    await vi.advanceTimersByTimeAsync(0);
    expect(syncAll).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(0);
    expect(syncAll).toHaveBeenCalledTimes(2);
  });

  it('refreshes every collection after a successful sync', async () => {
    renderHook(() => useAutoSync());
    await vi.advanceTimersByTimeAsync(0);
    for (const fn of Object.values(refreshers)) expect(fn).toHaveBeenCalled();
  });

  it('stops syncing after unmount', async () => {
    const { unmount } = renderHook(() => useAutoSync());
    await vi.advanceTimersByTimeAsync(0);
    expect(syncAll).toHaveBeenCalledTimes(1);
    unmount();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(syncAll).toHaveBeenCalledTimes(1);
  });
});

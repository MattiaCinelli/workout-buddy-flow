/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import type { SyncConflict } from '@/lib/syncConflicts';

const { conflicts, removeConflict, saveExerciseToDB, refreshExercises } = vi.hoisted(() => {
  const conflicts: SyncConflict[] = [];
  return {
    conflicts,
    removeConflict: vi.fn((collection: string, id: string) => {
      const i = conflicts.findIndex(c => c.collection === collection && c.id === id);
      if (i >= 0) conflicts.splice(i, 1);
    }),
    saveExerciseToDB: vi.fn(async (_record: Record<string, unknown>) => {}),
    refreshExercises: vi.fn(async () => {}),
  };
});

vi.mock('@/lib/syncConflicts', () => ({
  getConflicts: () => [...conflicts],
  removeConflict,
}));
vi.mock('@/lib/db', () => ({
  saveExerciseToDB,
  saveWorkoutToDB: vi.fn(), saveScheduledWorkoutToDB: vi.fn(), saveCourseToDB: vi.fn(),
  saveWorkoutSessionToDB: vi.fn(), saveMuscleGroupToDB: vi.fn(), saveBodyMetricToDB: vi.fn(),
}));
vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    refreshExercises, refreshWorkouts: vi.fn(), refreshScheduledWorkouts: vi.fn(),
    refreshCourses: vi.fn(), refreshSessions: vi.fn(), refreshMuscleGroups: vi.fn(), refreshBodyMetrics: vi.fn(),
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SyncConflicts } from './SyncConflicts';

const addConflict = (over: Partial<SyncConflict> = {}) => {
  conflicts.push({
    collection: 'exercises', id: 'e1', label: 'Squat',
    mineUpdatedAt: '2026-01-01T00:00:00.000Z', theirsUpdatedAt: '2026-02-01T00:00:00.000Z',
    theirsDeleted: false, detectedAt: '2026-02-01T00:00:00.000Z', mine: { id: 'e1', name: 'Squat' },
    ...over,
  });
};

beforeEach(() => { conflicts.length = 0; vi.clearAllMocks(); });
afterEach(() => cleanup());

describe('SyncConflicts', () => {
  it('renders nothing when there are no conflicts', () => {
    const { container } = render(<SyncConflicts />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each conflict with its label', () => {
    addConflict({ label: 'Squat' });
    addConflict({ id: 'e2', label: 'Bench', mine: { id: 'e2', name: 'Bench' } });
    render(<SyncConflicts />);
    expect(screen.getByText('Squat')).toBeInTheDocument();
    expect(screen.getByText('Bench')).toBeInTheDocument();
    expect(screen.getByText(/2 changes were replaced/)).toBeInTheDocument();
  });

  it('"Keep mine" re-saves the local record (without deletedAt, fresh updatedAt) and clears the conflict', async () => {
    addConflict({ mine: { id: 'e1', name: 'Squat', deletedAt: '2026-01-01T00:00:00.000Z' } });
    render(<SyncConflicts />);

    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }));

    await waitFor(() => expect(saveExerciseToDB).toHaveBeenCalled());
    const saved = saveExerciseToDB.mock.calls[0]![0];
    expect(saved).toMatchObject({ id: 'e1', name: 'Squat' });
    expect(saved.deletedAt).toBeUndefined();
    expect(saved.updatedAt).toEqual(expect.any(String));
    expect(refreshExercises).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Squat')).not.toBeInTheDocument());
  });

  it('"Dismiss" removes the conflict without saving anything', () => {
    addConflict();
    render(<SyncConflicts />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(removeConflict).toHaveBeenCalledWith('exercises', 'e1');
    expect(saveExerciseToDB).not.toHaveBeenCalled();
    expect(screen.queryByText('Squat')).not.toBeInTheDocument();
  });
});

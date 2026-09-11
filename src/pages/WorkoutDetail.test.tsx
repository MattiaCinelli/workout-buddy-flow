/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { navigate, toast, updateWorkout } = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: vi.fn(),
  updateWorkout: vi.fn(async () => {}),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'workout-1' }),
  useNavigate: () => navigate,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/Navbar', () => ({ default: () => null }));
vi.mock('@/components/ExerciseItem', () => ({ default: () => null }));
vi.mock('@/components/UnilateralSetNote', () => ({ UnilateralSetNote: () => null }));
vi.mock('@/lib/backup', () => ({ shareWorkout: vi.fn() }));
vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    workouts: [{
      id: 'workout-1',
      date: '2026-09-11T00:00:00.000Z',
      title: 'Mobility',
      category: 'flexibility',
      duration: 5,
      sets: [{ exerciseId: 'exercise-1', duration: 30 }],
    }],
    exercises: [{
      id: 'exercise-1',
      name: 'Stretch',
      category: 'flexibility',
      muscleGroups: ['hips'],
      difficulty: 'beginner',
      logType: 'time',
    }],
    workoutsLoading: false,
    muscleGroups: [{ id: 'hips', name: 'Hips' }],
    createWorkout: vi.fn(),
    updateWorkout,
    deleteWorkout: vi.fn(),
  }),
}));

import WorkoutDetail from './WorkoutDetail';

describe('WorkoutDetail', () => {
  beforeEach(() => {
    navigate.mockClear();
    toast.mockClear();
    updateWorkout.mockReset();
    updateWorkout.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it('returns to the workout library after a successful save', async () => {
    render(<WorkoutDetail />);

    const save = await screen.findByRole('button', { name: 'Save Changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(updateWorkout).toHaveBeenCalledOnce());
    expect(navigate).toHaveBeenCalledWith('/workouts');
  });

  it('keeps the editor open when saving fails', async () => {
    updateWorkout.mockRejectedValueOnce(new Error('write failed'));
    render(<WorkoutDetail />);

    const save = await screen.findByRole('button', { name: 'Save Changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(updateWorkout).toHaveBeenCalledOnce());
    expect(navigate).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }));
  });
});

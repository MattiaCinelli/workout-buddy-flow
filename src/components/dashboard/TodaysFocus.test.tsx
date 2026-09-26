/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { data, toast, navigate } = vi.hoisted(() => ({
  data: {
    sessions: [] as unknown[],
    getScheduledWorkoutsForDate: vi.fn(),
    getWorkoutById: vi.fn(),
    createSession: vi.fn(async (item: object) => ({ id: 's1', ...item })),
    deleteSession: vi.fn(async () => null),
    completeWorkoutInCourse: vi.fn(async () => ({})),
    uncompleteWorkoutInCourse: vi.fn(async () => ({})),
  },
  toast: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@/contexts/useData', () => ({ useData: () => data }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@capacitor/haptics', () => ({ Haptics: { impact: vi.fn(async () => undefined) }, ImpactStyle: { Medium: 'MEDIUM' } }));
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

import TodaysFocus from './TodaysFocus';

const schedule = { id: 'sch', workoutId: 'w1', displayDate: '2026-09-25', startTime: '07:00', skipped: false };
const workout = {
  id: 'w1', title: 'Legs', duration: 30, category: 'strength', notes: '', restBetweenSets: 60, restBetweenExercises: 90,
  sets: [{ exerciseId: 'squat', reps: 10, weight: 40 }],
};

beforeEach(() => {
  vi.useFakeTimers();
  data.sessions = [];
  data.getScheduledWorkoutsForDate.mockReturnValue([schedule]);
  data.getWorkoutById.mockReturnValue(workout);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const renderCard = () => render(<MemoryRouter><TodaysFocus /></MemoryRouter>);
const row = () => screen.getByText('Legs').closest('[title]') as HTMLElement;

describe('TodaysFocus hold to mark done', () => {
  it('saves the workout as planned after a hold, without opening it', async () => {
    renderCard();
    fireEvent.pointerDown(row(), { pointerType: 'touch', clientX: 5, clientY: 5 });
    await act(async () => { vi.advanceTimersByTime(600); });
    fireEvent.pointerUp(row());
    fireEvent.click(screen.getByRole('button', { name: 'Start Legs' }));

    expect(data.createSession).toHaveBeenCalledWith(expect.objectContaining({
      workoutId: 'w1', scheduledWorkoutId: 'sch', scheduledDate: '2026-09-25', duration: 30,
      actualSets: [expect.objectContaining({ exerciseId: 'squat', completed: true, reps: 10, weight: 40 })],
    }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Marked as done' }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing when released early or when the finger scrolls away', async () => {
    renderCard();
    fireEvent.pointerDown(row(), { pointerType: 'touch', clientX: 5, clientY: 5 });
    await act(async () => { vi.advanceTimersByTime(300); });
    fireEvent.pointerUp(row());
    fireEvent.pointerDown(row(), { pointerType: 'touch', clientX: 5, clientY: 5 });
    // A phone fires pointercancel once the touch turns into a page scroll.
    fireEvent.pointerCancel(row());
    await act(async () => { vi.advanceTimersByTime(1000); });

    expect(data.createSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start Legs' }));
    expect(navigate).toHaveBeenCalled();
  });
});

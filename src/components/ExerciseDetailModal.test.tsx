/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/lib/backup', () => ({ shareExercise: vi.fn() }));
vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({ muscleGroups: [{ id: 'neck', name: 'Neck' }] }),
}));

import { ExerciseDetailModal } from './ExerciseDetailModal';

const exercise = {
  id: 'neck-rolls',
  name: 'Neck rolls',
  category: 'flexibility' as const,
  muscleGroups: ['neck'],
  difficulty: 'beginner' as const,
  logType: 'time' as const,
  defaultSets: 2,
  defaultDuration: 30,
  imageUrl: '/exercises/neck-rolls.jpg',
};

describe('ExerciseDetailModal image viewer', () => {
  afterEach(cleanup);

  it('opens the exercise image full screen and closes only the viewer', () => {
    render(<ExerciseDetailModal exercise={exercise} onClose={vi.fn()} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'View Neck rolls image full screen' }));

    const viewer = screen.getByRole('dialog', { name: 'Neck rolls image' });
    expect(within(viewer).getByAltText('Neck rolls — full screen')).toBeInTheDocument();

    fireEvent.click(within(viewer).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Neck rolls image' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /Neck rolls/i })).toBeInTheDocument();
  });

  it('keeps every exercise action inside a two-column footer', () => {
    render(<ExerciseDetailModal exercise={exercise} onClose={vi.fn()} onEdit={vi.fn()} />);

    const tryButton = screen.getByRole('button', { name: 'Try exercise' });
    const actions = tryButton.closest('[data-exercise-actions]');
    expect(actions).not.toBeNull();
    expect(actions).toHaveClass('grid', 'grid-cols-2');
    expect(actions).not.toHaveClass('sm:flex');
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Progress' })).toBeInTheDocument();
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Try exercise' })).toBeInTheDocument();
  });
});

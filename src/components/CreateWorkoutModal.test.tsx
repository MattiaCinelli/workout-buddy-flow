/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { exercise } = vi.hoisted(() => ({
  exercise: {
    id: 'stretch-1',
    name: 'Standing Stretch',
    category: 'flexibility' as const,
    muscleGroups: ['hips'],
    difficulty: 'beginner' as const,
    logType: 'time' as const,
    defaultSets: 2,
    defaultDuration: 30,
    imageUrl: 'private-exercise:standing-stretch.jpg',
  },
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/useData', () => ({
  useData: () => ({
    exercises: [exercise],
    createWorkout: vi.fn(),
    muscleGroups: [{ id: 'hips', name: 'Hips' }],
  }),
}));
vi.mock('./ExerciseItem', () => ({
  default: ({ exercise: item, onSelect }: { exercise: typeof exercise; onSelect: (value: typeof exercise) => void }) => (
    <button type="button" onClick={() => onSelect(item)}>Add {item.name}</button>
  ),
}));
vi.mock('./ExerciseImage', () => ({
  default: ({ imageUrl, alt, className }: { imageUrl: string; alt: string; className: string }) => (
    <img src={imageUrl} alt={alt} className={className} />
  ),
}));

import CreateWorkoutModal from './CreateWorkoutModal';

describe('CreateWorkoutModal selected exercises', () => {
  afterEach(cleanup);

  it('keeps the exercise library open after adding an exercise', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);

    const libraryTab = screen.getByRole('tab', { name: 'Exercise Library' });
    fireEvent.click(screen.getByRole('button', { name: `Add ${exercise.name}` }));

    expect(libraryTab).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('button', { name: `Add ${exercise.name}` })).toBeInTheDocument();
  });

  it('shows the exercise thumbnail above its remove button', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: `Add ${exercise.name}` }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Selected Exercises (1)' }), {
      button: 0,
      ctrlKey: false,
    });

    const thumbnail = screen.getByAltText(`${exercise.name} thumbnail`);
    const actions = thumbnail.closest('[data-selected-exercise-actions]');
    expect(actions).not.toBeNull();
    expect(actions).toHaveClass('flex-col');
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('shows the exercise position beside its name', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: `Add ${exercise.name}` }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Selected Exercises (1)' }), {
      button: 0,
      ctrlKey: false,
    });

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: `1. ${exercise.name}` })).toBeInTheDocument();
  });

  it('allows the same exercise to be added as independently ordered occurrences', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);

    const add = screen.getByRole('button', { name: `Add ${exercise.name}` });
    fireEvent.click(add);
    fireEvent.click(add);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Selected Exercises (2)' }), {
      button: 0,
      ctrlKey: false,
    });

    expect(screen.getByRole('heading', { name: `1. ${exercise.name}` })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: `2. ${exercise.name}` })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
  });

  it('duplicates an exercise immediately with all of its set settings', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: `Add ${exercise.name}` }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Selected Exercises (1)' }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.change(screen.getAllByLabelText('Duration (sec):')[0], { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

    expect(screen.getByRole('heading', { name: `2. ${exercise.name}` })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Duration (sec):').map(input => (input as HTMLInputElement).value))
      .toEqual(['45', '30', '45', '30']);
  });
});

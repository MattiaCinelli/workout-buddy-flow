/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('asks before discarding an unfinished workout', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Draft workout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('heading', { name: 'Discard this workout draft?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();
  });

  it('keeps the exercise library open after adding an exercise', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);

    const libraryTab = screen.getByRole('tab', { name: 'Exercise Library' });
    fireEvent.click(screen.getByRole('button', { name: `Add ${exercise.name}` }));

    expect(libraryTab).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('button', { name: `Add ${exercise.name}` })).toBeInTheDocument();
  });

  it('keeps the selection total visible and provides a review shortcut', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: `Add ${exercise.name}` }));

    expect(screen.getByText((_, element) =>
      element?.tagName === 'SPAN' && element.textContent?.replace(/\s+/g, ' ').trim() === '1 selected · 2 sets'
    )).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(screen.getByRole('tab', { name: 'Selected Exercises (1)' })).toHaveAttribute('data-state', 'active');
  });

  it('shows the exercise thumbnail, a set summary and its sets', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: `Add ${exercise.name}` }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Selected Exercises (1)' }), {
      button: 0,
      ctrlKey: false,
    });

    expect(screen.getByAltText(`${exercise.name} thumbnail`)).toBeInTheDocument();
    expect(screen.getByText('2 sets · 30s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Remove ${exercise.name}` })).toBeInTheDocument();
    // A freshly added exercise opens its sets straight away for editing.
    expect(screen.getAllByLabelText('Time (s)')).toHaveLength(2);
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
    expect(screen.getAllByRole('button', { name: `Remove ${exercise.name}` })).toHaveLength(2);
  });

  it('duplicates an exercise immediately with all of its set settings', () => {
    render(<CreateWorkoutModal isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: `Add ${exercise.name}` }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Selected Exercises (1)' }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.change(screen.getAllByLabelText('Time (s)')[0], { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: `Duplicate ${exercise.name}` }));

    expect(screen.getByRole('heading', { name: `2. ${exercise.name}` })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Time (s)').map(input => (input as HTMLInputElement).value))
      .toEqual(['45', '30', '45', '30']);
  });
});

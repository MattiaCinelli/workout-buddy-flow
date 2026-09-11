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
vi.mock('@/contexts/DataContext', () => ({
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
});

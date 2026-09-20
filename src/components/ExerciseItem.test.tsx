/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/useData', () => ({ useData: () => ({ muscleGroups: [] }) }));

import ExerciseItem from './ExerciseItem';

const exercise = {
  id: 'push-up', name: 'Push-up', category: 'strength' as const, muscleGroups: [], difficulty: 'beginner' as const,
};

describe('ExerciseItem', () => {
  afterEach(cleanup);

  it('selects the exercise card', () => {
    const onSelect = vi.fn();
    render(<ExerciseItem exercise={exercise} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(exercise);
  });
});

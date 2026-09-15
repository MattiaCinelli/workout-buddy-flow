/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/DataContext', () => ({ useData: () => ({ muscleGroups: [] }) }));

import ExerciseItem from './ExerciseItem';

const exercise = {
  id: 'push-up', name: 'Push-up', category: 'strength' as const, muscleGroups: [], difficulty: 'beginner' as const,
  variations: [{ id: 'incline', name: 'Incline Push-up', difficulty: 'beginner' as const, imageUrl: '/incline.jpg' }],
};

describe('ExerciseItem variation stack', () => {
  afterEach(cleanup);

  it('reveals searchable variations and selects the exact variation', () => {
    const onSelectVariation = vi.fn();
    render(<ExerciseItem exercise={exercise} onSelect={vi.fn()} onSelectVariation={onSelectVariation} expandVariations />);

    const stackToggle = screen.getAllByRole('button', { name: /1 variation/i })
      .find(element => element.tagName === 'BUTTON');
    expect(stackToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByText('Incline Push-up').closest('button')!);
    expect(onSelectVariation).toHaveBeenCalledWith(exercise, exercise.variations[0]);
  });
});

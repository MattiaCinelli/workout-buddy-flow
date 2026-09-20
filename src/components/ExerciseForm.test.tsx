/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/contexts/useData', () => ({
  useData: () => ({ muscleGroups: [{ id: 'hamstrings', name: 'Hamstrings' }] }),
}));

import ExerciseForm from './ExerciseForm';

describe('ExerciseForm', () => {
  afterEach(cleanup);

  it('renders an existing exercise without crashing', () => {
    render(<ExerciseForm
      exercise={{
        id: 'hamstring-stretch',
        name: 'Hamstring stretch',
        category: 'flexibility',
        muscleGroups: ['hamstrings'],
        difficulty: 'beginner',
      }}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />);

    expect(screen.getByDisplayValue('Hamstring stretch')).toBeInTheDocument();
    expect(screen.queryByText('Variations')).not.toBeInTheDocument();
  });

  it('shows four explicit image slots when side and orientation are combined', () => {
    render(<ExerciseForm
      exercise={{
        id: 'four-way-stretch', name: 'Four-way stretch', category: 'flexibility',
        muscleGroups: ['hamstrings'], difficulty: 'beginner',
        executionDirections: ['left', 'right', 'forward', 'backward'],
      }}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />);

    for (const label of ['Left–Forward', 'Right–Forward', 'Left–Backward', 'Right–Backward']) {
      // One label is the direction selector; the other is its image slot.
      expect(screen.getAllByText(label)).toHaveLength(2);
    }
  });
});

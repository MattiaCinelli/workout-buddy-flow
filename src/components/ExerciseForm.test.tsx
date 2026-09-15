/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({ muscleGroups: [{ id: 'hamstrings', name: 'Hamstrings' }] }),
}));

import ExerciseForm from './ExerciseForm';

describe('ExerciseForm', () => {
  afterEach(cleanup);

  it('renders an existing exercise and its variations without crashing', () => {
    render(<ExerciseForm
      exercise={{
        id: 'hamstring-stretch',
        name: 'Hamstring stretch',
        category: 'flexibility',
        muscleGroups: ['hamstrings'],
        difficulty: 'beginner',
        variations: [{ id: 'single-leg', name: 'Single-leg', difficulty: 'intermediate' }],
      }}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />);

    expect(screen.getByDisplayValue('Hamstring stretch')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Single-leg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });
});

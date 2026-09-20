/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
const resizeImageToDataUrl = vi.fn();
vi.mock('@/lib/image', () => ({
  readFileAsDataUrl: vi.fn(),
  resizeImageToDataUrl: (...args: unknown[]) => resizeImageToDataUrl(...args),
}));
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

  it('waits for a Left–Backward image to finish processing before saving it', async () => {
    let finishResize!: (value: string) => void;
    resizeImageToDataUrl.mockReturnValueOnce(new Promise(resolve => { finishResize = resolve; }));
    const onSubmit = vi.fn();
    const { container } = render(<ExerciseForm
      exercise={{
        id: 'forearm-stretch', name: 'Forearm Stretch', category: 'flexibility',
        muscleGroups: ['hamstrings'], difficulty: 'beginner',
        executionDirections: ['left-forward', 'right-forward', 'left-backward', 'right-backward'],
      }}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />);

    const slots = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    // Default, Left–Forward, Right–Forward, Left–Backward, Right–Backward.
    fireEvent.change(slots[3], {
      target: { files: [new File(['photo'], 'left-backward.png', { type: 'image/png' })] },
    });

    const update = screen.getByRole('button', { name: 'Processing image...' });
    expect(update).toBeDisabled();
    fireEvent.submit(update.closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();

    finishResize('data:image/jpeg;base64,left-backward');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      directionImageUrls: expect.objectContaining({
        'left-backward': 'data:image/jpeg;base64,left-backward',
      }),
    })));
  });
});

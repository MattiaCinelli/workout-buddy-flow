/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutEntry } from '@/data/workoutHistory';

vi.mock('@/contexts/useData', () => ({
  useData: () => ({
    exercises: [
      { id: 'roll', name: 'Wrist Roll', category: 'flexibility', muscleGroups: [], difficulty: 'beginner', logType: 'time' },
      { id: 'prayer', name: 'Prayer Stretch', category: 'flexibility', muscleGroups: [], difficulty: 'beginner', logType: 'time' },
      { id: 'biceps', name: 'Wrist-Biceps Stretch', category: 'flexibility', muscleGroups: [], difficulty: 'beginner', logType: 'time' },
    ],
  }),
}));

import WorkoutCard from './WorkoutCard';

const wristWorkout: WorkoutEntry = {
  id: 'wrists',
  title: '5 Mins Wrists Stretch',
  date: '2026-09-18',
  duration: 18,
  category: 'flexibility',
  restBetweenSets: 0,
  restBetweenExercises: 0,
  sets: [
    { exerciseId: 'roll', duration: 15 },
    { exerciseId: 'prayer', duration: 15, direction: 'forward' },
    { exerciseId: 'prayer', duration: 15, direction: 'backward' },
    { exerciseId: 'biceps', duration: 30, direction: 'left' },
    { exerciseId: 'biceps', duration: 30, direction: 'right' },
    { exerciseId: 'biceps', duration: 30, direction: 'left' },
    { exerciseId: 'biceps', duration: 30, direction: 'right' },
  ],
};

describe('WorkoutCard workout template summary', () => {
  it('shows exercise count and calculated duration instead of template date and stale duration', () => {
    render(<MemoryRouter><WorkoutCard workout={wristWorkout} /></MemoryRouter>);

    expect(screen.getByText('3 exercises')).toBeInTheDocument();
    expect(screen.getByText('2m 45s')).toBeInTheDocument();
    expect(screen.queryByText('18 min')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sep 18/)).not.toBeInTheDocument();
  });
});

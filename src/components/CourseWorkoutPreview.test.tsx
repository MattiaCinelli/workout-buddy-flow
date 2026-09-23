/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Exercise } from '@/data/exercises';
import type { WorkoutEntry } from '@/data/workoutHistory';
import { CourseWorkoutPreview } from './CourseWorkoutPreview';

const squat: Exercise = {
  id: 'squat', name: 'Bodyweight Squat', category: 'strength', muscleGroups: ['legs'],
  difficulty: 'beginner', logType: 'reps',
};

const workout: WorkoutEntry = {
  id: 'lower-body', date: '2026-09-22', title: 'Lower body', duration: 10, category: 'strength',
  sets: [
    { exerciseId: 'squat', occurrenceId: 'squat-a', reps: 10, weight: 20, direction: 'left' },
    { exerciseId: 'squat', occurrenceId: 'squat-a', reps: 10, weight: 20, direction: 'right' },
    { exerciseId: 'squat', occurrenceId: 'squat-b', reps: 5 },
    { exerciseId: 'missing', occurrenceId: 'missing-a', duration: 30 },
  ],
};

describe('CourseWorkoutPreview', () => {
  afterEach(cleanup);

  it('expands duplicate exercise blocks in authored order with set details', () => {
    render(<CourseWorkoutPreview workout={workout} getExerciseById={id => id === squat.id ? squat : undefined} />);

    expect(screen.queryByText('Bodyweight Squat')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview exercises (3)' }));

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('Bodyweight Squat')).toBeInTheDocument();
    expect(within(items[0]).getByText('2 sets × 10 reps · 20 kg · Left, Right')).toBeInTheDocument();
    expect(within(items[1]).getByText('1 set × 5 reps')).toBeInTheDocument();
    expect(within(items[2]).getByText('Missing exercise')).toBeInTheDocument();
    expect(within(items[2]).getByText('1 set × 30s')).toBeInTheDocument();
  });

  it('explains when a course workout is empty', () => {
    render(<CourseWorkoutPreview workout={{ ...workout, sets: [] }} getExerciseById={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview exercises (0)' }));
    expect(screen.getByText('This workout has no exercises yet.')).toBeInTheDocument();
  });
});


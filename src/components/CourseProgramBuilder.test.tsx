/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, within, cleanup } from '@testing-library/react';
import CourseProgramBuilder from './CourseProgramBuilder';
import type { CourseWorkout } from '@/data/courses';
import type { WorkoutEntry } from '@/data/workoutHistory';

const workouts = [
  { id: 'w1', title: 'Push', date: '2026-01-01', duration: 30, category: 'strength', sets: [] },
  { id: 'w2', title: 'Pull', date: '2026-01-01', duration: 30, category: 'strength', sets: [] },
] as WorkoutEntry[];

const wItem = (over: Partial<CourseWorkout>): CourseWorkout => ({
  id: over.id ?? crypto.randomUUID(), type: 'workout', workoutId: 'w1',
  order: 1, week: 1, day: 1, completed: false, ...over,
});

// Stateful harness so onChange feeds back into items, like the real editor.
const Harness = ({ initial }: { initial: CourseWorkout[] }) => {
  const [items, setItems] = useState(initial);
  return (
    <>
      <CourseProgramBuilder items={items} workouts={workouts} onChange={setItems} />
      <output data-testid="dump">{JSON.stringify(items.map(i => ({ id: i.id, order: i.order, type: i.type, week: i.week, day: i.day, workoutId: i.workoutId })))}</output>
    </>
  );
};
const dump = () => JSON.parse(screen.getByTestId('dump').textContent!);

afterEach(() => cleanup());

describe('CourseProgramBuilder', () => {
  it('prompts to create a workout first when there are none', () => {
    render(<CourseProgramBuilder items={[]} workouts={[]} onChange={() => {}} />);
    expect(screen.getByText(/Create a workout first/)).toBeInTheDocument();
  });

  it('"Single" and "Rest" append a session with the next order number', () => {
    render(<Harness initial={[wItem({ id: 'a', order: 1 })]} />);
    fireEvent.click(screen.getByRole('button', { name: /Single/ }));
    fireEvent.click(screen.getByRole('button', { name: /Rest/ }));

    const rows = dump();
    expect(rows).toHaveLength(3);
    expect(rows.map((r: CourseWorkout) => r.order)).toEqual([1, 2, 3]);
    expect(rows[2].type).toBe('rest');
  });

  it('flags sessions that still need a workout selected', () => {
    render(<Harness initial={[wItem({ id: 'a', workoutId: undefined })]} />);
    expect(screen.getByText(/still need a workout selected/)).toBeInTheDocument();
  });

  // Each session card's header has exactly three buttons, in order: up, down, delete.
  const cardControls = (headingRegex: RegExp) => {
    const card = screen.getByText(headingRegex).closest('.space-y-3') as HTMLElement;
    const [up, down, del] = within(card).getAllByRole('button');
    return { card, up, down, del };
  };

  it('reorders sessions and renumbers order on move', () => {
    render(<Harness initial={[
      wItem({ id: 'a', order: 1, workoutId: 'w1' }),
      wItem({ id: 'b', order: 2, workoutId: 'w2' }),
    ]} />);

    fireEvent.click(cardControls(/^1\. /).down); // move first row down

    const rows = dump();
    expect(rows.map((r: CourseWorkout) => r.id)).toEqual(['b', 'a']);
    expect(rows.map((r: CourseWorkout) => r.order)).toEqual([1, 2]);
  });

  it('removes a session and renumbers the rest', () => {
    render(<Harness initial={[
      wItem({ id: 'a', order: 1 }), wItem({ id: 'b', order: 2 }), wItem({ id: 'c', order: 3 }),
    ]} />);

    fireEvent.click(cardControls(/^2\. /).del);

    const rows = dump();
    expect(rows.map((r: CourseWorkout) => r.id)).toEqual(['a', 'c']);
    expect(rows.map((r: CourseWorkout) => r.order)).toEqual([1, 2]);
  });

  it('clamps a per-session week to >= 1 and day to 1..7', () => {
    render(<Harness initial={[wItem({ id: 'a', week: 3, day: 3 })]} />);
    const [weekInput, dayInput] = screen.getAllByDisplayValue('3'); // DOM order: week, then day

    fireEvent.change(weekInput, { target: { value: '0' } });
    expect(dump()[0].week).toBe(1);

    fireEvent.change(dayInput, { target: { value: '9' } });
    expect(dump()[0].day).toBe(7);
  });
});

/** @vitest-environment jsdom */
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultMuscleGroups } from '@/data/muscleGroups';
import { MuscleTagPicker } from './MuscleTagPicker';

let latest: string[] = [];
const Harness = ({ initial = [] as string[] }) => {
  const [value, setValue] = useState(initial);
  latest = value;
  return <MuscleTagPicker groups={defaultMuscleGroups} value={value} onChange={setValue} />;
};
const region = (name: RegExp) => screen.getByRole('button', { name });

afterEach(cleanup);

describe('MuscleTagPicker', () => {
  it('shows only the regions until one is opened', () => {
    render(<Harness />);
    expect(screen.queryByRole('button', { name: 'Quadriceps' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBe(6); // five regions + Full Body
  });

  it('selects a whole region on tap, narrows to muscles, and clears on a second tap while open', () => {
    render(<Harness />);
    fireEvent.click(region(/^Legs & Feet/));
    expect(latest).toEqual(['region:legs-feet']);

    fireEvent.click(screen.getByRole('button', { name: 'Quadriceps' }));
    expect(latest).toEqual(['Quadriceps']);
    expect(region(/^Legs & Feet · 1/)).toHaveAttribute('aria-pressed', 'true');

    // Unticking the last muscle falls back to the whole region.
    fireEvent.click(screen.getByRole('button', { name: 'Quadriceps' }));
    expect(latest).toEqual(['region:legs-feet']);

    fireEvent.click(region(/^Legs & Feet/));
    expect(latest).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Quadriceps' })).not.toBeInTheDocument();
  });

  it('opens a selected but closed region without clearing it', () => {
    render(<Harness initial={['Glutes', 'Hips']} />);
    fireEvent.click(region(/^Core & Hips · 2/));
    expect(latest).toEqual(['Glutes', 'Hips']);
    expect(screen.getByRole('button', { name: 'Glutes' })).toHaveAttribute('aria-pressed', 'true');
  });
});

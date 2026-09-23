/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Measurement } from '@/data/measurements';

const { data, toast } = vi.hoisted(() => ({
  data: {
    measurements: [] as Measurement[],
    createMeasurement: vi.fn(async (item: unknown) => item),
    updateMeasurement: vi.fn(async () => null),
    deleteMeasurement: vi.fn(async () => null),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/contexts/useData', () => ({ useData: () => data }));
vi.mock('sonner', () => ({ toast }));
// Recharts needs real layout; the chart itself is not what these tests cover.
vi.mock('recharts', () => {
  const Stub = () => null;
  return {
    ResponsiveContainer: Stub, LineChart: Stub, Line: Stub, CartesianGrid: Stub, XAxis: Stub, YAxis: Stub, Tooltip: Stub,
  };
});

import { MeasurementsCard } from './MeasurementsCard';

const entry = (over: Partial<Measurement>): Measurement => ({
  id: 'e', measurementId: 'toe', name: 'Toe touch', kind: 'length', better: 'lower', value: 20, date: '2026-01-01', ...over,
});

beforeEach(() => {
  data.measurements = [];
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const openNewRecord = () => fireEvent.click(screen.getByRole('button', { name: /New record/i }));

describe('MeasurementsCard', () => {
  it('invites the first record when empty', () => {
    render(<MeasurementsCard />);
    expect(screen.getByText(/No records yet/i)).toBeInTheDocument();
  });

  it('saves a new length record with lower-is-better as the default and the typed value', async () => {
    render(<MeasurementsCard />);
    openNewRecord();
    const dialog = screen.getByRole('dialog', { name: /New record/i });

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: '  Toe touch ' } });
    fireEvent.change(within(dialog).getByLabelText(/Description/i), { target: { value: 'Seated, legs straight' } });
    fireEvent.change(within(dialog).getByLabelText('Value'), { target: { value: '12,5' } });
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-09-01' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save record' }));

    await waitFor(() => expect(data.createMeasurement).toHaveBeenCalledTimes(1));
    expect(data.createMeasurement).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Toe touch', description: 'Seated, legs straight', kind: 'length', better: 'lower',
      value: 12.5, date: '2026-09-01', notes: undefined,
      measurementId: expect.any(String),
    }));
    expect(toast.success).toHaveBeenCalled();
  });

  it('switching to time defaults to higher-is-better and accepts minutes:seconds', async () => {
    render(<MeasurementsCard />);
    openNewRecord();
    const dialog = screen.getByRole('dialog', { name: /New record/i });

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Plank' } });
    fireEvent.change(within(dialog).getByLabelText('Measured in'), { target: { value: 'time' } });
    expect(within(dialog).getByLabelText('What is an improvement?')).toHaveValue('higher');
    fireEvent.change(within(dialog).getByLabelText('Value'), { target: { value: '1:30' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save record' }));

    await waitFor(() => expect(data.createMeasurement).toHaveBeenCalled());
    expect(data.createMeasurement).toHaveBeenCalledWith(expect.objectContaining({ kind: 'time', better: 'higher', value: 90 }));
  });

  it('refuses an empty name or an unusable value and saves nothing', () => {
    render(<MeasurementsCard />);
    openNewRecord();
    const dialog = screen.getByRole('dialog', { name: /New record/i });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save record' }));
    expect(toast.error).toHaveBeenLastCalledWith('Give the record a name.');

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Toe touch' } });
    fireEvent.change(within(dialog).getByLabelText('Value'), { target: { value: 'lots' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save record' }));
    expect(toast.error).toHaveBeenLastCalledWith(expect.stringMatching(/Enter a valid value/));

    expect(data.createMeasurement).not.toHaveBeenCalled();
  });

  it('shows a shrinking gap as an improvement and flags the new best', () => {
    data.measurements = [
      entry({ id: 'a', value: 20, date: '2026-01-01' }),
      entry({ id: 'b', value: 12, date: '2026-02-01' }),
    ];
    render(<MeasurementsCard />);
    const row = screen.getByRole('button', { name: /Toe touch/ });
    // Latest and best are both 12 cm: the newest value is the best one.
    expect(within(row).getAllByText('12 cm')).toHaveLength(2);
    expect(within(row).getByText('8 cm better')).toBeInTheDocument();
    expect(within(row).getByText('New best')).toBeInTheDocument();
  });

  it('logs another value under the same measurement', async () => {
    data.measurements = [entry({ id: 'a', measurementId: 'toe-1', description: 'Seated' })];
    render(<MeasurementsCard />);
    fireEvent.click(screen.getByRole('button', { name: /Toe touch/ }));

    const dialog = screen.getByRole('dialog', { name: 'Toe touch' });
    fireEvent.change(within(dialog).getByLabelText('Value'), { target: { value: '-3' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log' }));

    await waitFor(() => expect(data.createMeasurement).toHaveBeenCalledTimes(1));
    expect(data.createMeasurement).toHaveBeenCalledWith(expect.objectContaining({
      measurementId: 'toe-1', name: 'Toe touch', description: 'Seated', kind: 'length', better: 'lower', value: -3,
    }));
  });

  it('deletes every value of a record only after confirming', async () => {
    data.measurements = [entry({ id: 'a' }), entry({ id: 'b', value: 15, date: '2026-02-01' })];
    render(<MeasurementsCard />);
    fireEvent.click(screen.getByRole('button', { name: /Toe touch/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Toe touch' })).getByRole('button', { name: /Delete record/ }));

    expect(data.deleteMeasurement).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(data.deleteMeasurement).toHaveBeenCalledTimes(2));
    expect(data.deleteMeasurement.mock.calls.map(call => (call as unknown[])[0]).sort()).toEqual(['a', 'b']);
  });

  it('renames a record across all of its values', async () => {
    data.measurements = [entry({ id: 'a' }), entry({ id: 'b', value: 15, date: '2026-02-01' })];
    render(<MeasurementsCard />);
    fireEvent.click(screen.getByRole('button', { name: /Toe touch/ }));
    const dialog = screen.getByRole('dialog', { name: 'Toe touch' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit details' }));
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Seated toe touch' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save details' }));

    await waitFor(() => expect(data.updateMeasurement).toHaveBeenCalledTimes(2));
    expect(data.updateMeasurement).toHaveBeenCalledWith('a', expect.objectContaining({ name: 'Seated toe touch' }));
    expect(data.updateMeasurement).toHaveBeenCalledWith('b', expect.objectContaining({ name: 'Seated toe touch' }));
  });
});

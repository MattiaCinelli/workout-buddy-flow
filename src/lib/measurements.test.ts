import { describe, expect, it } from 'vitest';
import type { Measurement } from '@/data/measurements';
import { defaultBetter, formatMeasurementValue, groupMeasurements, parseMeasurementInput } from './measurements';

const entry = (overrides: Partial<Measurement>): Measurement => ({
  id: 'e', measurementId: 'm1', name: 'Toe touch', kind: 'length', better: 'lower',
  value: 10, date: '2026-01-01', ...overrides,
});

describe('parseMeasurementInput', () => {
  it('reads lengths, including decimals with a comma and negative values', () => {
    expect(parseMeasurementInput('length', '12.5')).toBe(12.5);
    expect(parseMeasurementInput('length', '12,5')).toBe(12.5);
    expect(parseMeasurementInput('length', '-5')).toBe(-5);
    expect(parseMeasurementInput('length', '−5')).toBe(-5); // typographic minus from a phone keyboard
  });

  it('reads time as seconds or minutes:seconds', () => {
    expect(parseMeasurementInput('time', '90')).toBe(90);
    expect(parseMeasurementInput('time', '1:30')).toBe(90);
    expect(parseMeasurementInput('time', '1:02:03')).toBe(3723);
    expect(parseMeasurementInput('time', '1:75')).toBeUndefined();
  });

  it('rejects empty, non-numeric and out-of-range input', () => {
    for (const bad of ['', '  ', 'abc', '1e3', '1.2.3', 'Infinity', '--5']) {
      expect(parseMeasurementInput('length', bad), bad).toBeUndefined();
    }
    expect(parseMeasurementInput('weight', '-1')).toBeUndefined();
    expect(parseMeasurementInput('weight', '99999')).toBeUndefined();
    expect(parseMeasurementInput('time', '-3')).toBeUndefined();
    expect(parseMeasurementInput('time', '25:00:00')).toBeUndefined();
  });
});

describe('formatMeasurementValue', () => {
  it('formats each kind in its unit', () => {
    expect(formatMeasurementValue('length', 12.5)).toBe('12.5 cm');
    expect(formatMeasurementValue('length', -5)).toBe('-5 cm');
    expect(formatMeasurementValue('weight', 80)).toBe('80 kg');
    expect(formatMeasurementValue('time', 45)).toBe('45 s');
    expect(formatMeasurementValue('time', 90)).toBe('1:30');
    expect(formatMeasurementValue('time', 3723)).toBe('1:02:03');
  });
});

describe('groupMeasurements', () => {
  it('treats a smaller value as the best when lower is better (toe touch gap)', () => {
    const [group] = groupMeasurements([
      entry({ id: 'a', value: 20, date: '2026-01-01' }),
      entry({ id: 'b', value: 12, date: '2026-02-01' }),
      entry({ id: 'c', value: 15, date: '2026-03-01' }),
    ]);
    expect(group.best.id).toBe('b');
    expect(group.latest.id).toBe('c');
    expect(group.change).toBe(3);
    expect(group.improved).toBe(false); // gap got bigger
    expect(group.isNewBest).toBe(false);
  });

  it('treats a larger value as the best when higher is better', () => {
    const [group] = groupMeasurements([
      entry({ id: 'a', kind: 'time', better: 'higher', value: 30, date: '2026-01-01' }),
      entry({ id: 'b', kind: 'time', better: 'higher', value: 45, date: '2026-02-01' }),
    ]);
    expect(group.best.id).toBe('b');
    expect(group.improved).toBe(true);
    expect(group.isNewBest).toBe(true);
  });

  it('flags a new best only when the latest strictly beats every earlier entry', () => {
    const [tied] = groupMeasurements([
      entry({ id: 'a', value: 10, date: '2026-01-01' }),
      entry({ id: 'b', value: 10, date: '2026-02-01' }),
    ]);
    expect(tied.isNewBest).toBe(false);
    expect(tied.improved).toBeUndefined();
    expect(tied.best.id).toBe('a'); // the first to reach it keeps the date

    const [single] = groupMeasurements([entry({ id: 'a' })]);
    expect(single.isNewBest).toBe(false);
    expect(single.change).toBeUndefined();
  });

  it('handles values that cross zero (reaching past the toes)', () => {
    const [group] = groupMeasurements([
      entry({ id: 'a', value: 3, date: '2026-01-01' }),
      entry({ id: 'b', value: -2, date: '2026-02-01' }),
    ]);
    expect(group.best.id).toBe('b');
    expect(group.improved).toBe(true);
    expect(group.change).toBe(-5);
  });

  it('keeps separate measurements apart, most recently logged first, and takes the definition from the latest entry', () => {
    const groups = groupMeasurements([
      entry({ id: 'a', measurementId: 'plank', name: 'Plank', kind: 'time', better: 'higher', value: 60, date: '2026-01-10' }),
      entry({ id: 'b', measurementId: 'toe', name: 'Toe touch (old name)', date: '2026-01-01' }),
      entry({ id: 'c', measurementId: 'toe', name: 'Toe touch', description: 'Fingertips to floor', date: '2026-02-01' }),
    ]);
    expect(groups.map(group => group.measurementId)).toEqual(['toe', 'plank']);
    expect(groups[0].name).toBe('Toe touch');
    expect(groups[0].description).toBe('Fingertips to floor');
    expect(groups[0].entries).toHaveLength(2);
  });

  it('orders entries logged on the same day by when they were saved', () => {
    const [group] = groupMeasurements([
      entry({ id: 'later', value: 8, date: '2026-01-01', updatedAt: '2026-01-01T12:00:00.000Z' }),
      entry({ id: 'earlier', value: 9, date: '2026-01-01', updatedAt: '2026-01-01T08:00:00.000Z' }),
    ]);
    expect(group.latest.id).toBe('later');
  });
});

describe('defaultBetter', () => {
  it('suggests lower for lengths (gaps) and higher otherwise', () => {
    expect(defaultBetter('length')).toBe('lower');
    expect(defaultBetter('weight')).toBe('higher');
    expect(defaultBetter('time')).toBe('higher');
  });
});

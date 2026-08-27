import { describe, expect, it } from 'vitest';
import { describeSeries } from './chartA11y';

describe('describeSeries', () => {
  it('reports no data when there are no numeric points', () => {
    expect(describeSeries('Weight', [undefined, null], 'kg')).toBe('Weight: no data yet.');
  });

  it('summarises count, range and latest value', () => {
    expect(describeSeries('Weight', [80, 82, null, 81], 'kg'))
      .toBe('Weight: 3 points, 80 to 82 kg, most recent 81 kg.');
  });

  it('collapses the range when every value is equal and singularises one point', () => {
    expect(describeSeries('Weight', [75], 'kg')).toBe('Weight: 1 point, 75 kg, most recent 75 kg.');
  });
});

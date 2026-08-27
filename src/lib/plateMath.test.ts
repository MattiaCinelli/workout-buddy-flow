import { describe, expect, it } from 'vitest';
import { describePerSide, platesPerSide } from './plateMath';

describe('platesPerSide', () => {
  it('splits an exact load greedily, heaviest first', () => {
    expect(platesPerSide(100, 20).perSide).toEqual([25, 15]);
    expect(platesPerSide(60, 20).perSide).toEqual([20]);
  });

  it('handles fractional plates', () => {
    const result = platesPerSide(62.5, 20);
    expect(result.perSide).toEqual([20, 1.25]);
    expect(result.leftoverPerSide).toBe(0);
    expect(result.achievable).toBe(62.5);
  });

  it('reports the shortfall when the target is not reachable with available plates', () => {
    const result = platesPerSide(21, 20);
    expect(result.perSide).toEqual([]);
    expect(result.leftoverPerSide).toBe(0.5);
    expect(result.achievable).toBe(20);
  });

  it('returns an empty bar when the target is at or below the bar weight', () => {
    expect(platesPerSide(20, 20).perSide).toEqual([]);
    expect(platesPerSide(15, 20)).toMatchObject({ perSide: [], achievable: 20 });
  });

  it('respects a custom plate set', () => {
    expect(platesPerSide(50, 20, [10, 5]).perSide).toEqual([10, 5]);
  });
});

describe('describePerSide', () => {
  it('joins plates or names an empty bar', () => {
    expect(describePerSide([25, 15, 1.25])).toBe('25 + 15 + 1.25');
    expect(describePerSide([])).toBe('empty bar');
  });
});

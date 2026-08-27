import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins truthy class values and drops falsy ones', () => {
    const off = false;
    expect(cn('a', off && 'b', undefined, 'c')).toBe('a c');
  });

  it('lets a later Tailwind class win over an earlier conflicting one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('supports arrays and conditional objects', () => {
    expect(cn(['a', 'b'], { c: true, d: false })).toBe('a b c');
  });
});

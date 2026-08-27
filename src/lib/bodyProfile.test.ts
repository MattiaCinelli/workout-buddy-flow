import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BMI_CATEGORY_LABEL, bmiCategory, calculateBmi, getBodyProfile, setBodyProfile } from './bodyProfile';

const createLocalStorageStub = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
  };
};

describe('calculateBmi', () => {
  it('computes kg / m² to one decimal', () => {
    expect(calculateBmi(72, 178)).toBe(22.7);
    expect(calculateBmi(100, 200)).toBe(25);
  });

  it('returns null for missing or non-positive inputs', () => {
    expect(calculateBmi(0, 180)).toBeNull();
    expect(calculateBmi(70, 0)).toBeNull();
    expect(calculateBmi(-5, 180)).toBeNull();
  });
});

describe('bmiCategory', () => {
  it('maps to WHO adult bands', () => {
    expect(bmiCategory(17)).toBe('underweight');
    expect(bmiCategory(18.5)).toBe('normal');
    expect(bmiCategory(24.9)).toBe('normal');
    expect(bmiCategory(25)).toBe('overweight');
    expect(bmiCategory(30)).toBe('obese');
    expect(BMI_CATEGORY_LABEL[bmiCategory(22)]).toBe('Normal');
  });
});

describe('body profile storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageStub());
  });

  it('round-trips a height', () => {
    setBodyProfile({ heightCm: 181 });
    expect(getBodyProfile()).toEqual({ heightCm: 181 });
  });

  it('ignores absent or invalid stored heights', () => {
    expect(getBodyProfile()).toEqual({ heightCm: undefined });
    setBodyProfile({ heightCm: 0 });
    expect(getBodyProfile()).toEqual({ heightCm: undefined });
    localStorage.setItem('workout-buddy-body-profile', 'not json');
    expect(getBodyProfile()).toEqual({});
  });
});

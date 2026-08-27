// A single static personal attribute — height — kept in localStorage
// (there's no synced user profile in this app). Used only to turn logged
// body-weight entries into a BMI.

const STORAGE_KEY = 'workout-buddy-body-profile';

export interface BodyProfile {
  heightCm?: number;
}

export const getBodyProfile = (): BodyProfile => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<BodyProfile>;
    return { heightCm: typeof parsed.heightCm === 'number' && parsed.heightCm > 0 ? parsed.heightCm : undefined };
  } catch {
    return {};
  }
};

export const setBodyProfile = (profile: BodyProfile): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

// BMI = kg / m², rounded to one decimal. Null when either input is missing
// or non-positive.
export const calculateBmi = (weightKg: number, heightCm: number): number | null => {
  if (!(weightKg > 0) || !(heightCm > 0)) return null;
  const metres = heightCm / 100;
  return Math.round((weightKg / (metres * metres)) * 10) / 10;
};

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

// WHO adult cut-offs.
export const bmiCategory = (bmi: number): BmiCategory =>
  bmi < 18.5 ? 'underweight' : bmi < 25 ? 'normal' : bmi < 30 ? 'overweight' : 'obese';

export const BMI_CATEGORY_LABEL: Record<BmiCategory, string> = {
  underweight: 'Underweight',
  normal: 'Normal',
  overweight: 'Overweight',
  obese: 'Obese',
};

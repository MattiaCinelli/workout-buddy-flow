import { Exercise } from '@/data/exercises';

type ExerciseCategory = Exercise['category'];

// Each exercise category's accent colour, as it already appears on the
// category badge and the calendar chips (the hardcoded `workout-*` tokens
// from tailwind.config.ts).
//
// These are full literal class strings on purpose: Tailwind's JIT only
// generates classes it can see verbatim in source, so `bg-${colour}/10`
// would silently produce no CSS.
const CATEGORY_TINT: Record<ExerciseCategory, string> = {
  strength: 'bg-workout-blue/10 border-workout-blue/30',
  cardio: 'bg-workout-red/10 border-workout-red/30',
  flexibility: 'bg-workout-purple/10 border-workout-purple/30',
  balance: 'bg-workout-yellow/10 border-workout-yellow/30',
};

// A pale wash of the category colour for large surfaces (the library
// card) — a soft pastel cue rather than the solid badge fill. It's a
// translucent overlay on the card background, so it stays readable in both
// light and dark themes. Unknown categories get no tint.
export const exerciseCategoryTint = (category: string): string =>
  CATEGORY_TINT[category as ExerciseCategory] ?? '';

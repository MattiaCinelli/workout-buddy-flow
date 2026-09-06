import type { CourseWorkout } from '@/data/courses';

/** Calendar order first; `order` is the explicit sequence within one day. */
export const sortCourseItems = (items: CourseWorkout[]): CourseWorkout[] =>
  [...items].sort((a, b) => a.week - b.week || a.day - b.day || a.order - b.order);

/** Re-stamps a stable global order after arranging items by their program date. */
export const normalizeCourseItemOrder = (items: CourseWorkout[]): CourseWorkout[] =>
  sortCourseItems(items).map((item, index) => ({ ...item, order: index + 1 }));

export const getNextSameDayWorkout = (
  items: CourseWorkout[],
  currentItemId: string,
): CourseWorkout | undefined => {
  const sorted = sortCourseItems(items);
  const currentIndex = sorted.findIndex(item => item.id === currentItemId);
  if (currentIndex < 0) return undefined;
  const current = sorted[currentIndex];
  const next = sorted[currentIndex + 1];
  return next && next.week === current.week && next.day === current.day
    && next.type === 'workout' && !!next.workoutId && !next.completed
    ? next
    : undefined;
};

/** Adds minutes without tying course scheduling to a particular calendar date. */
export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const total = Math.max(0, hours * 60 + mins + minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

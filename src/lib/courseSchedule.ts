import type { CourseWorkout } from '@/data/courses';
import type { ScheduledWorkout } from '@/data/scheduledWorkouts';

/** Calendar order first; `order` is the explicit sequence within one day. */
export const sortCourseItems = (items: CourseWorkout[]): CourseWorkout[] =>
  [...items].sort((a, b) => a.week - b.week || a.day - b.day || a.order - b.order);

/** Re-stamps a stable global order after arranging items by their program date. */
export const normalizeCourseItemOrder = (items: CourseWorkout[]): CourseWorkout[] =>
  sortCourseItems(items).map((item, index) => ({ ...item, order: index + 1 }));

/**
 * Course slots the user skipped in the calendar. The calendar's skipped
 * dates are the only record, so the course page and calendar always agree.
 * A slot counts as skipped only when every calendar entry linked to it is
 * skipped: a slot moved to another day keeps a live entry and stays open.
 */
export const getSkippedCourseItemIds = (
  courseId: string,
  scheduledWorkouts: ScheduledWorkout[],
): Set<string> => {
  const entriesByItem = new Map<string, ScheduledWorkout[]>();
  for (const entry of scheduledWorkouts) {
    if (entry.courseId !== courseId || !entry.courseItemId || entry.deletedAt) continue;
    entriesByItem.set(entry.courseItemId, [...(entriesByItem.get(entry.courseItemId) ?? []), entry]);
  }
  const skipped = new Set<string>();
  for (const [itemId, entries] of entriesByItem) {
    if (entries.every(entry => entry.skippedDates?.includes(entry.startDate))) skipped.add(itemId);
  }
  return skipped;
};

/** The course's next slot to do: the first one neither done nor skipped. */
export const getNextCourseItem = (
  items: CourseWorkout[],
  skippedIds: ReadonlySet<string> = new Set(),
): CourseWorkout | null => sortCourseItems(items).find(item => !item.completed && !skippedIds.has(item.id)) ?? null;

export const getNextSameDayWorkout = (
  items: CourseWorkout[],
  currentItemId: string,
  skippedIds: ReadonlySet<string> = new Set(),
): CourseWorkout | undefined => {
  const sorted = sortCourseItems(items);
  const currentIndex = sorted.findIndex(item => item.id === currentItemId);
  if (currentIndex < 0) return undefined;
  const current = sorted[currentIndex];
  const next = sorted[currentIndex + 1];
  return next && next.week === current.week && next.day === current.day
    && next.type === 'workout' && !!next.workoutId && !next.completed && !skippedIds.has(next.id)
    ? next
    : undefined;
};

/** Adds minutes without tying course scheduling to a particular calendar date. */
export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const total = Math.max(0, hours * 60 + mins + minutes);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

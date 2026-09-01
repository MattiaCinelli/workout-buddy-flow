export type RecurrenceType = 'none' | 'daily' | 'weekly';

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduledWorkout {
  id: string;
  workoutId: string; // Reference to the workout template
  startDate: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // 24-hour format (HH:MM)
  endTime?: string; // Optional end time
  recurrence: RecurrenceType;
  recurrenceDays?: WeekDay[]; // For weekly recurrence, which day(s) — e.g. just Monday, or Mon-Fri
  endRecurrenceDate?: string; // Optional end date for recurring events
  notes?: string;
  /** Concrete occurrence dates the user intentionally skipped. */
  skippedDates?: string[];
  createdAt: string;
  updatedAt?: string; // stamped by useIndexedDBCollection; used as the sync watermark
  deletedAt?: string; // sync tombstone — set by useIndexedDBCollection on delete while a sync server is connected; offline deletes hard-remove the row instead
}

export const weekDays: WeekDay[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export const weekDayLabels: Record<WeekDay, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

export const weekDayShortLabels: Record<WeekDay, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun'
};

// Quick-select presets for the weekly day picker.
export const weekdaysPreset: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export const weekendPreset: WeekDay[] = ['saturday', 'sunday'];

// Helper to get day of week from a date
export const getDayOfWeek = (date: Date): WeekDay => {
  const days: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as WeekDay;
};

// Sample scheduled workouts for testing
export const defaultScheduledWorkouts: ScheduledWorkout[] = [];

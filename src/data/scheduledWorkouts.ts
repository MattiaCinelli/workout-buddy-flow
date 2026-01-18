export type RecurrenceType = 'none' | 'daily' | 'weekly';

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduledWorkout {
  id: string;
  workoutId: string; // Reference to the workout template
  startDate: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // 24-hour format (HH:MM)
  endTime?: string; // Optional end time
  recurrence: RecurrenceType;
  recurrenceDay?: WeekDay; // For weekly recurrence, which day
  endRecurrenceDate?: string; // Optional end date for recurring events
  notes?: string;
  createdAt: string;
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

// Helper to get day of week from a date
export const getDayOfWeek = (date: Date): WeekDay => {
  const days: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as WeekDay;
};

// Sample scheduled workouts for testing
export const defaultScheduledWorkouts: ScheduledWorkout[] = [];

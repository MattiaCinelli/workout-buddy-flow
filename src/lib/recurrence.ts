import { addDays, isAfter, isBefore, isSameDay, parseISO, format } from 'date-fns';
import { ScheduledWorkout, getDayOfWeek } from '@/data/scheduledWorkouts';

export interface ExpandedScheduledWorkout extends ScheduledWorkout {
  displayDate: string; // The actual date this instance appears on
  skipped: boolean;
}

// Expands recurrence rules ('none' / 'daily' / 'weekly', the latter against
// one or more chosen weekdays via recurrenceDays) into concrete dated
// instances that fall within [startDate, endDate]. Nothing recurring is ever
// written per-day to the DB; this is purely a read-time projection.
export const expandScheduledWorkouts = (
  scheduledWorkouts: ScheduledWorkout[],
  startDate: Date,
  endDate: Date
): ExpandedScheduledWorkout[] => {
  const expanded: ExpandedScheduledWorkout[] = [];

  scheduledWorkouts.forEach(sw => {
    const scheduleStartDate = parseISO(sw.startDate);
    const scheduleEndDate = sw.endRecurrenceDate ? parseISO(sw.endRecurrenceDate) : null;

    if (sw.recurrence === 'none') {
      if (
        (isSameDay(scheduleStartDate, startDate) || isAfter(scheduleStartDate, startDate)) &&
        (isSameDay(scheduleStartDate, endDate) || isBefore(scheduleStartDate, endDate))
      ) {
        expanded.push({ ...sw, displayDate: sw.startDate, skipped: sw.skippedDates?.includes(sw.startDate) ?? false });
      }
    } else if (sw.recurrence === 'daily') {
      let currentDate = isBefore(scheduleStartDate, startDate) ? startDate : scheduleStartDate;

      while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
        if (scheduleEndDate && isAfter(currentDate, scheduleEndDate)) break;

        if (isSameDay(currentDate, scheduleStartDate) || isAfter(currentDate, scheduleStartDate)) {
          const displayDate = format(currentDate, 'yyyy-MM-dd');
          expanded.push({ ...sw, displayDate, skipped: sw.skippedDates?.includes(displayDate) ?? false });
        }

        currentDate = addDays(currentDate, 1);
      }
    } else if (sw.recurrence === 'weekly' && sw.recurrenceDays && sw.recurrenceDays.length > 0) {
      let currentDate = isBefore(scheduleStartDate, startDate) ? startDate : scheduleStartDate;

      while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
        if (scheduleEndDate && isAfter(currentDate, scheduleEndDate)) break;

        const dayOfWeek = getDayOfWeek(currentDate);
        if (
          sw.recurrenceDays.includes(dayOfWeek) &&
          (isSameDay(currentDate, scheduleStartDate) || isAfter(currentDate, scheduleStartDate))
        ) {
          const displayDate = format(currentDate, 'yyyy-MM-dd');
          expanded.push({ ...sw, displayDate, skipped: sw.skippedDates?.includes(displayDate) ?? false });
        }

        currentDate = addDays(currentDate, 1);
      }
    }
  });

  expanded.sort((a, b) => {
    const dateCompare = a.displayDate.localeCompare(b.displayDate);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  return expanded;
};

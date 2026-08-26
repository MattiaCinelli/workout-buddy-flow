import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { addDays, isAfter, isSameDay, parseISO, set, subMinutes } from 'date-fns';
import { ScheduledWorkout, getDayOfWeek } from '@/data/scheduledWorkouts';
import { getNotificationSettings } from '@/lib/notificationSettings';

const notificationId = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
};

// Walks day by day rather than stepping a fixed interval from startDate —
// weekly recurrence can now span several chosen weekdays (e.g. Mon/Wed/Fri),
// not just whichever one startDate happens to land on.
const occurrences = (schedule: ScheduledWorkout) => {
  const [hour, minute] = schedule.startTime.split(':').map(Number);
  const start = parseISO(schedule.startDate);
  const end = schedule.endRecurrenceDate ? set(parseISO(schedule.endRecurrenceDate), { hours: 23, minutes: 59 }) : addDays(new Date(), 90);
  const dates: Date[] = [];
  let current = start;
  while (!isAfter(current, end) && dates.length < 90) {
    const isOccurrence = schedule.recurrence === 'none'
      ? isSameDay(current, start)
      : schedule.recurrence === 'daily'
      ? true
      : (schedule.recurrenceDays ?? []).includes(getDayOfWeek(current));

    if (isOccurrence) {
      const at = set(current, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
      if (isAfter(at, new Date())) dates.push(at);
    }

    if (schedule.recurrence === 'none') break;
    current = addDays(current, 1);
  }
  return dates;
};

export const cancelWorkoutReminders = async (scheduleId: string) => {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  const matching = pending.notifications.filter(item => item.extra?.scheduleId === scheduleId);
  if (matching.length) await LocalNotifications.cancel({ notifications: matching.map(item => ({ id: item.id })) });
};

export const scheduleWorkoutReminders = async (schedule: ScheduledWorkout, workoutTitle: string) => {
  if (!Capacitor.isNativePlatform()) return;
  await cancelWorkoutReminders(schedule.id);

  // Disabling reminders altogether just means: cancel whatever was there
  // (above) and schedule nothing new. Existing calendar data is untouched
  // either way — this only ever affects the OS-level alarms.
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;
  const notifications = occurrences(schedule)
    .map((at, index) => ({ at, fireAt: subMinutes(at, settings.leadMinutes), index }))
    // A long lead time on a near-term occurrence (e.g. a 60-minute lead
    // just enabled for a workout starting in 10 minutes) can push the
    // adjusted fire time into the past — occurrences() only checked the
    // workout's own start time, not the lead-adjusted one. Scheduling a
    // past time would fire immediately rather than skip it, so drop those.
    .filter(({ fireAt }) => isAfter(fireAt, new Date()))
    .map(({ at, fireAt, index }) => ({
      id: notificationId(`${schedule.id}:${at.toISOString()}`),
      title: 'Workout reminder',
      body: settings.leadMinutes > 0
        ? `${workoutTitle} starts in ${settings.leadMinutes} minute${settings.leadMinutes === 1 ? '' : 's'}`
        : `${workoutTitle} starts now`,
      schedule: { at: fireAt, allowWhileIdle: true },
      extra: { scheduleId: schedule.id, workoutId: schedule.workoutId, occurrence: index }
    }));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
};

// Re-derives every reminder from the current calendar data — used when
// notification settings change, since already-scheduled alarms were
// computed under the OLD lead time / enabled state and won't update
// themselves.
export const rescheduleAllReminders = async (
  scheduledWorkouts: ScheduledWorkout[],
  getWorkoutTitle: (workoutId: string) => string | undefined
) => {
  if (!Capacitor.isNativePlatform()) return;
  for (const schedule of scheduledWorkouts) {
    if (schedule.deletedAt) continue;
    await scheduleWorkoutReminders(schedule, getWorkoutTitle(schedule.workoutId) ?? 'Workout');
  }
};

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { addDays, format, isAfter, isSameDay, parseISO, set, subMinutes } from 'date-fns';
import { ScheduledWorkout, getDayOfWeek } from '@/data/scheduledWorkouts';
import type { WorkoutSession } from '@/data/workoutSessions';
import { getNotificationSettings } from '@/lib/notificationSettings';
import { isScheduledOccurrenceCompleted } from '@/lib/scheduleCompletion';

export const WORKOUT_NOTIFICATION_ACTION_TYPE = 'WORKOUT_REMINDER';
export const WORKOUT_NOTIFICATION_START_ACTION = 'START_WORKOUT';
export const WORKOUT_NOTIFICATION_SNOOZE_ACTION = 'SNOOZE_WORKOUT';
export const WORKOUT_NOTIFICATION_SKIP_ACTION = 'SKIP_WORKOUT';

let actionsRegistered = false;
export const registerWorkoutNotificationActions = async () => {
  if (!Capacitor.isNativePlatform() || actionsRegistered) return;
  await LocalNotifications.registerActionTypes({
    types: [{
      id: WORKOUT_NOTIFICATION_ACTION_TYPE,
      actions: [
        { id: WORKOUT_NOTIFICATION_START_ACTION, title: 'Start', foreground: true },
        { id: WORKOUT_NOTIFICATION_SNOOZE_ACTION, title: 'Snooze 10 min' },
        { id: WORKOUT_NOTIFICATION_SKIP_ACTION, title: 'Skip today', destructive: true },
      ],
    }],
  });
  actionsRegistered = true;
};

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

    if (isOccurrence && !schedule.skippedDates?.includes(format(current, 'yyyy-MM-dd'))) {
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

export const scheduleWorkoutReminders = async (
  schedule: ScheduledWorkout,
  workoutTitle: string,
  sessions: WorkoutSession[] = [],
) => {
  if (!Capacitor.isNativePlatform()) return;
  await registerWorkoutNotificationActions();
  await cancelWorkoutReminders(schedule.id);

  // Disabling reminders altogether just means: cancel whatever was there
  // (above) and schedule nothing new. Existing calendar data is untouched
  // either way — this only ever affects the OS-level alarms.
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;
  const notifications = occurrences(schedule)
    // Use the exact same completion rule as Today's Focus. A workout already
    // completed for this occurrence must not retain (or regain after an app
    // refresh) an OS-level reminder later that day.
    .filter(at => !isScheduledOccurrenceCompleted({
      id: schedule.id,
      workoutId: schedule.workoutId,
      displayDate: format(at, 'yyyy-MM-dd'),
    }, sessions))
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
      actionTypeId: WORKOUT_NOTIFICATION_ACTION_TYPE,
      extra: {
        scheduleId: schedule.id,
        workoutId: schedule.workoutId,
        scheduledDate: format(at, 'yyyy-MM-dd'),
        courseId: schedule.courseId,
        courseItemId: schedule.courseItemId,
        occurrence: index,
      }
    }));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
};

export const snoozeWorkoutReminder = async (extra: unknown, workoutTitle: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform() || !extra || typeof extra !== 'object') return false;
  const values = extra as Record<string, unknown>;
  if (typeof values.workoutId !== 'string') return false;
  await registerWorkoutNotificationActions();
  const at = new Date(Date.now() + 10 * 60_000);
  await LocalNotifications.schedule({ notifications: [{
    id: notificationId(`snooze:${values.scheduleId ?? ''}:${values.workoutId}:${at.toISOString()}`),
    title: 'Workout reminder',
    body: `${workoutTitle} — snoozed for 10 minutes`,
    schedule: { at, allowWhileIdle: true },
    actionTypeId: WORKOUT_NOTIFICATION_ACTION_TYPE,
    extra: values,
  }] });
  return true;
};

// Re-derives every reminder from the current calendar data — used when
// notification settings change, since already-scheduled alarms were
// computed under the OLD lead time / enabled state and won't update
// themselves.
export const rescheduleAllReminders = async (
  scheduledWorkouts: ScheduledWorkout[],
  getWorkoutTitle: (workoutId: string) => string | undefined,
  sessions: WorkoutSession[] = [],
) => {
  if (!Capacitor.isNativePlatform()) return;
  for (const schedule of scheduledWorkouts) {
    if (schedule.deletedAt) continue;
    await scheduleWorkoutReminders(schedule, getWorkoutTitle(schedule.workoutId) ?? 'Workout', sessions);
  }
};

// Used after a replace-style backup restore. Unlike the ordinary refresh,
// this also removes reminders for schedules that no longer exist.
export const replaceAllWorkoutReminders = async (
  scheduledWorkouts: ScheduledWorkout[],
  getWorkoutTitle: (workoutId: string) => string | undefined,
  sessions: WorkoutSession[] = [],
) => {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  const appNotifications = pending.notifications.filter(item => typeof item.extra?.scheduleId === 'string');
  if (appNotifications.length) {
    await LocalNotifications.cancel({ notifications: appNotifications.map(item => ({ id: item.id })) });
  }
  await rescheduleAllReminders(scheduledWorkouts, getWorkoutTitle, sessions);
};

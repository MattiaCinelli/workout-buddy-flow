import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { addDays, addWeeks, isAfter, parseISO, set } from 'date-fns';
import { ScheduledWorkout } from '@/data/scheduledWorkouts';

const notificationId = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
};

const occurrences = (schedule: ScheduledWorkout) => {
  const [hour, minute] = schedule.startTime.split(':').map(Number);
  const first = set(parseISO(schedule.startDate), { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
  const end = schedule.endRecurrenceDate ? set(parseISO(schedule.endRecurrenceDate), { hours: 23, minutes: 59 }) : addDays(new Date(), 90);
  const dates: Date[] = [];
  let current = first;
  while (!isAfter(current, end) && dates.length < 90) {
    if (isAfter(current, new Date())) dates.push(current);
    if (schedule.recurrence === 'none') break;
    current = schedule.recurrence === 'daily' ? addDays(current, 1) : addWeeks(current, 1);
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
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;
  await cancelWorkoutReminders(schedule.id);
  const notifications = occurrences(schedule).map((at, index) => ({
    id: notificationId(`${schedule.id}:${at.toISOString()}`),
    title: 'Workout reminder',
    body: `${workoutTitle} starts now`,
    schedule: { at, allowWhileIdle: true },
    extra: { scheduleId: schedule.id, workoutId: schedule.workoutId, occurrence: index }
  }));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
};

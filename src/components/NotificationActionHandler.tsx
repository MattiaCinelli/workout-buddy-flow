import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useNavigate } from 'react-router-dom';
import { notificationWorkoutSessionUrl } from '@/lib/workoutSessionUrl';
import { useData } from '@/contexts/useData';
import {
  snoozeWorkoutReminder, WORKOUT_NOTIFICATION_SKIP_ACTION,
  WORKOUT_NOTIFICATION_SNOOZE_ACTION,
} from '@/lib/notifications';
import { toast } from 'sonner';
import { getScheduledWorkoutByIdFromDB } from '@/lib/db';

// Native notification taps arrive whether the app was already open or was
// launched from the notification. Keep this mounted inside BrowserRouter so
// both cases enter the guided workout through the normal React route.
const NotificationActionHandler = () => {
  const navigate = useNavigate();
  const data = useData();
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;
    void LocalNotifications.addListener('localNotificationActionPerformed', action => {
      const extra = action.notification.extra as Record<string, unknown> | undefined;
      if (action.actionId === WORKOUT_NOTIFICATION_SNOOZE_ACTION) {
        const workoutId = typeof extra?.workoutId === 'string' ? extra.workoutId : '';
        void snoozeWorkoutReminder(extra, dataRef.current.getWorkoutById(workoutId)?.title ?? 'Workout')
          .then(done => done && toast.success('Workout reminder snoozed for 10 minutes'))
          .catch(() => toast.error('Could not snooze this reminder'));
        return;
      }
      if (action.actionId === WORKOUT_NOTIFICATION_SKIP_ACTION) {
        const scheduleId = typeof extra?.scheduleId === 'string' ? extra.scheduleId : '';
        const scheduledDate = typeof extra?.scheduledDate === 'string' ? extra.scheduledDate : '';
        if (!scheduleId || !scheduledDate) {
          toast.error('Could not identify the scheduled workout to skip');
          return;
        }
        void (async () => {
          const schedule = dataRef.current.scheduledWorkouts.find(item => item.id === scheduleId)
            ?? await getScheduledWorkoutByIdFromDB(scheduleId);
          if (!schedule) throw new Error('Schedule not found');
          const skippedDates = [...new Set([...(schedule.skippedDates ?? []), scheduledDate])];
          await dataRef.current.updateScheduledWorkout(schedule.id, { skippedDates });
          toast.success('Workout skipped for today');
        })().catch(() => toast.error('Could not skip this workout'));
        return;
      }
      const url = notificationWorkoutSessionUrl(action.notification.extra);
      if (url) navigate(url);
    }).then(handle => {
      if (disposed) void handle.remove();
      else removeListener = () => handle.remove();
    });

    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [navigate]);

  return null;
};

export default NotificationActionHandler;

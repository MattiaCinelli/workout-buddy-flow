import { useCallback, useEffect, useRef } from 'react';
import { useData } from '@/contexts/useData';
import { rescheduleAllReminders } from '@/lib/notifications';

// Native notification APIs have a finite scheduling horizon. Rebuild the
// rolling window on startup and whenever the app returns to the foreground.
const ReminderRefresh = () => {
  const { scheduledWorkouts, scheduledWorkoutsLoading, sessions, sessionsLoading, getWorkoutById } = useData();
  const dataRef = useRef({ scheduledWorkouts, sessions, getWorkoutById });
  const refreshQueue = useRef<Promise<void>>(Promise.resolve());
  dataRef.current = { scheduledWorkouts, sessions, getWorkoutById };
  const scheduleSignature = scheduledWorkouts.map(item => `${item.id}:${item.updatedAt ?? item.createdAt}`).join('|');
  const completionSignature = sessions.map(item => `${item.id}:${item.completedAt}:${item.scheduledWorkoutId ?? ''}:${item.scheduledDate ?? ''}`).join('|');

  const refresh = useCallback(() => {
    // Serialize refreshes. If a session is saved while an older refresh is
    // still talking to the OS, the newer pass must run last so that stale
    // work cannot re-add the just-completed occurrence's notification.
    refreshQueue.current = refreshQueue.current
      .catch(() => undefined)
      .then(() => {
        const current = dataRef.current;
        return rescheduleAllReminders(
          current.scheduledWorkouts,
          workoutId => current.getWorkoutById(workoutId)?.title,
          current.sessions,
        );
      })
      .catch(error => console.warn('Could not refresh workout reminders:', error));
  }, []);

  useEffect(() => {
    if (!scheduledWorkoutsLoading && !sessionsLoading) refresh();
  }, [scheduledWorkoutsLoading, sessionsLoading, scheduleSignature, completionSignature, refresh]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refresh]);

  return null;
};

export default ReminderRefresh;

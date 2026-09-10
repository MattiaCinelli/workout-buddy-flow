import { useCallback, useEffect, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import { rescheduleAllReminders } from '@/lib/notifications';

// Native notification APIs have a finite scheduling horizon. Rebuild the
// rolling window on startup and whenever the app returns to the foreground.
const ReminderRefresh = () => {
  const { scheduledWorkouts, scheduledWorkoutsLoading, getWorkoutById } = useData();
  const dataRef = useRef({ scheduledWorkouts, getWorkoutById });
  dataRef.current = { scheduledWorkouts, getWorkoutById };

  const refresh = useCallback(() => {
    const current = dataRef.current;
    void rescheduleAllReminders(
      current.scheduledWorkouts,
      workoutId => current.getWorkoutById(workoutId)?.title,
    ).catch(error => console.warn('Could not refresh workout reminders:', error));
  }, []);

  useEffect(() => {
    if (!scheduledWorkoutsLoading) refresh();
  }, [scheduledWorkoutsLoading, refresh]);

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

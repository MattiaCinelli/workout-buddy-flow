import { useEffect, useRef } from 'react';
import { isConnected, syncAll } from '@/lib/syncClient';
import { useData } from '@/contexts/DataContext';

const SYNC_INTERVAL_MS = 30_000;

// Runs syncAll() on an interval, plus immediately whenever the app becomes
// visible again (opening the app, or switching back to its tab), so both
// devices' data converges without anyone having to remember to press a
// button. No-ops entirely when sync isn't configured — isConnected() is a
// synchronous localStorage check, so this costs nothing for the (default,
// still fully supported) offline-only case.
//
// Errors are swallowed here (only logged): a background sync failing
// because the server is temporarily unreachable — phone left the house,
// laptop asleep — shouldn't surface as a user-facing error interrupting
// whatever they're doing. The manual "Sync now" button in
// Settings still surfaces errors, since that's an explicit,
// in-the-moment action the user is watching.
export const useAutoSync = () => {
  const {
    refreshExercises, refreshWorkouts, refreshScheduledWorkouts, refreshCourses, refreshSessions,
    refreshMuscleGroups, refreshBodyMetrics,
  } = useData();
  const syncingRef = useRef(false);

  useEffect(() => {
    const runSync = async () => {
      if (!isConnected() || syncingRef.current) return;
      syncingRef.current = true;
      try {
        await syncAll();
        await Promise.all([
          refreshExercises(), refreshWorkouts(), refreshScheduledWorkouts(), refreshCourses(), refreshSessions(),
          refreshMuscleGroups(), refreshBodyMetrics(),
        ]);
      } catch (error) {
        console.warn('Background sync failed (will retry on the next interval):', error);
      } finally {
        syncingRef.current = false;
      }
    };

    void runSync();
    const interval = window.setInterval(() => void runSync(), SYNC_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void runSync();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [
    refreshExercises, refreshWorkouts, refreshScheduledWorkouts, refreshCourses, refreshSessions,
    refreshMuscleGroups, refreshBodyMetrics,
  ]);
};

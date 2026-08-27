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
const MAX_BACKOFF_MS = 15 * 60_000;

export const useAutoSync = () => {
  const {
    refreshExercises, refreshWorkouts, refreshScheduledWorkouts, refreshCourses, refreshSessions,
    refreshMuscleGroups, refreshBodyMetrics,
  } = useData();
  const syncingRef = useRef(false);
  const failuresRef = useRef(0);
  const nextAllowedAtRef = useRef(0);

  useEffect(() => {
    const runSync = async (force = false) => {
      if (!isConnected() || syncingRef.current) return;
      // Back off after repeated failures (server down, phone offline) so a
      // dead connection isn't hammered every 30s. A manual trigger or the
      // app returning to the foreground clears the wait.
      if (!force && Date.now() < nextAllowedAtRef.current) return;
      syncingRef.current = true;
      try {
        await syncAll();
        await Promise.all([
          refreshExercises(), refreshWorkouts(), refreshScheduledWorkouts(), refreshCourses(), refreshSessions(),
          refreshMuscleGroups(), refreshBodyMetrics(),
        ]);
        failuresRef.current = 0;
        nextAllowedAtRef.current = 0;
      } catch (error) {
        failuresRef.current += 1;
        const wait = Math.min(SYNC_INTERVAL_MS * 2 ** Math.min(failuresRef.current, 5), MAX_BACKOFF_MS);
        nextAllowedAtRef.current = Date.now() + wait;
        console.warn(`Background sync failed (retry in ~${Math.round(wait / 1000)}s):`, error);
      } finally {
        syncingRef.current = false;
      }
    };

    void runSync();
    const interval = window.setInterval(() => void runSync(), SYNC_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void runSync(true);
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

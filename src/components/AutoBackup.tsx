import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useData } from '@/contexts/useData';
import { createAutomaticBackup } from '@/lib/backup';

const BACKUP_DELAY_MS = 15_000;

// Coalesces a burst of edits into one private on-device snapshot. It runs
// only in the installed native app; browser users retain manual export and
// optional server sync without attempting to squeeze a full backup into
// localStorage.
const AutoBackup = () => {
  const data = useData();
  const running = useRef(false);
  const timer = useRef<number>();
  const ready = !data.isLoading;
  const signature = [
    data.exercises, data.workouts, data.sessions, data.scheduledWorkouts,
    data.courses, data.muscleGroups, data.bodyMetrics,
  ].map(items => `${items.length}:${items.map(item => item.updatedAt ?? item.id).join(',')}`).join('|');

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !ready) return;
    const run = async () => {
      if (running.current) return;
      running.current = true;
      try { await createAutomaticBackup(); }
      catch (error) { console.warn('Could not create automatic device snapshot:', error); }
      finally { running.current = false; }
    };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void run(), BACKUP_DELAY_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        window.clearTimeout(timer.current);
        void run();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ready, signature]);

  return null;
};

export default AutoBackup;

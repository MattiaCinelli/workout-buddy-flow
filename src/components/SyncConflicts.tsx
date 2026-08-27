import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { getConflicts, removeConflict, SyncConflict } from '@/lib/syncConflicts';
import {
  saveBodyMetricToDB, saveCourseToDB, saveExerciseToDB, saveMuscleGroupToDB,
  saveScheduledWorkoutToDB, saveWorkoutSessionToDB, saveWorkoutToDB,
} from '@/lib/db';

const SAVERS = {
  exercises: saveExerciseToDB,
  workouts: saveWorkoutToDB,
  scheduledWorkouts: saveScheduledWorkoutToDB,
  courses: saveCourseToDB,
  workoutSessions: saveWorkoutSessionToDB,
  muscleGroups: saveMuscleGroupToDB,
  bodyMetrics: saveBodyMetricToDB,
} as unknown as Record<string, (record: Record<string, unknown>) => Promise<void>>;

// Shown in the Sync settings when a background sync found that a record we
// edited on this device was overwritten by a newer version from elsewhere.
// "Keep mine" re-writes the local version with a fresh timestamp, so it
// wins on the next push.
export function SyncConflicts() {
  const data = useData();
  const [conflicts, setConflicts] = useState<SyncConflict[]>(getConflicts);

  if (conflicts.length === 0) return null;

  const refreshers: Record<string, () => Promise<void>> = {
    exercises: data.refreshExercises,
    workouts: data.refreshWorkouts,
    scheduledWorkouts: data.refreshScheduledWorkouts,
    courses: data.refreshCourses,
    workoutSessions: data.refreshSessions,
    muscleGroups: data.refreshMuscleGroups,
    bodyMetrics: data.refreshBodyMetrics,
  };

  const keepMine = async (conflict: SyncConflict) => {
    try {
      const record: Record<string, unknown> = { ...conflict.mine, updatedAt: new Date().toISOString() };
      delete record.deletedAt;
      await SAVERS[conflict.collection](record);
      await refreshers[conflict.collection]?.();
      removeConflict(conflict.collection, conflict.id);
      setConflicts(getConflicts());
      toast.success('Your version restored — it will sync on the next run.');
    } catch (error) {
      console.error('Could not restore local version:', error);
      toast.error('Could not restore that version.');
    }
  };

  const dismiss = (conflict: SyncConflict) => {
    removeConflict(conflict.collection, conflict.id);
    setConflicts(getConflicts());
  };

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        {conflicts.length} change{conflicts.length === 1 ? '' : 's'} were replaced by a newer version from another device
      </div>
      <ul className="space-y-2">
        {conflicts.map(conflict => (
          <li key={`${conflict.collection}:${conflict.id}`} className="rounded-md border bg-background/60 p-2 text-sm">
            <p className="font-medium">{conflict.label || `${conflict.collection} ${conflict.id.slice(0, 8)}`}</p>
            <p className="text-xs text-muted-foreground">
              {conflict.theirsDeleted ? 'Deleted' : 'Edited'} on another device
              {conflict.mineUpdatedAt && ` · your edit ${new Date(conflict.mineUpdatedAt).toLocaleString()}`}
            </p>
            <div className="mt-1.5 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => keepMine(conflict)}>Keep mine</Button>
              <Button size="sm" variant="ghost" onClick={() => dismiss(conflict)}>Dismiss</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

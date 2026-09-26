import { useState } from 'react';
import { format, parse } from 'date-fns';
import { useData } from '@/contexts/useData';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';

/**
 * Records a scheduled workout as done exactly as planned, the same record a
 * guided session saves when every set is left ticked: for a workout done
 * away from the phone, or history that went missing. A past occurrence is
 * dated at its scheduled day and time so it lands on the right day in
 * History; today's is dated now. Undo in the toast removes it again.
 */
export const useMarkWorkoutDone = () => {
  const { toast } = useToast();
  const { getWorkoutById, createSession, deleteSession, completeWorkoutInCourse, uncompleteWorkoutInCourse } = useData();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const markDone = async (scheduled: ExpandedScheduledWorkout, key = `${scheduled.id}-${scheduled.displayDate}`): Promise<boolean> => {
    const workout = getWorkoutById(scheduled.workoutId);
    if (!workout || savingKey) return false;
    setSavingKey(key);
    try {
      const completedAt = scheduled.displayDate < format(new Date(), 'yyyy-MM-dd')
        ? parse(`${scheduled.displayDate} ${scheduled.startTime || '12:00'}`, 'yyyy-MM-dd HH:mm', new Date()).toISOString()
        : new Date().toISOString();
      const { courseId, courseItemId } = scheduled;
      const created = await createSession({
        workoutId: workout.id, completedAt, date: completedAt, title: workout.title,
        duration: workout.duration, plannedDuration: workout.duration, category: workout.category,
        sets: workout.sets, restBetweenSets: workout.restBetweenSets,
        restBetweenExercises: workout.restBetweenExercises, notes: workout.notes,
        courseId, courseItemId, scheduledWorkoutId: scheduled.id, scheduledDate: scheduled.displayDate,
        actualSets: workout.sets.map((set, setIndex) => ({ exerciseId: set.exerciseId, setIndex,
          completed: true, reps: set.reps, weight: set.weight, duration: set.duration, distance: set.distance,
          direction: set.direction, warmup: set.warmup, amrap: set.amrap })),
      });
      if (courseId && courseItemId) {
        try {
          const updated = await completeWorkoutInCourse(courseId, courseItemId);
          if (!updated) throw new Error('The linked course or workout slot no longer exists.');
        } catch (courseError) {
          await deleteSession(created.id).catch(() => undefined);
          throw courseError;
        }
      }
      toast({
        title: 'Marked as done',
        description: `"${workout.title}" was added to your history as planned.`,
        action: <ToastAction altText={`Undo marking ${workout.title} done`} onClick={() => void (async () => {
          await deleteSession(created.id);
          if (courseId && courseItemId) await uncompleteWorkoutInCourse(courseId, courseItemId);
        })()}>Undo</ToastAction>,
      });
      return true;
    } catch (error) {
      console.error('Failed to mark workout done:', error);
      toast({ title: 'Could not mark workout done', description: 'Please try again.', variant: 'destructive' });
      return false;
    } finally {
      setSavingKey(null);
    }
  };

  return { markDone, savingKey };
};

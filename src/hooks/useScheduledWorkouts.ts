import { useState, useEffect, useCallback } from 'react';
import { ScheduledWorkout, getDayOfWeek, WeekDay } from '@/data/scheduledWorkouts';
import {
  getAllScheduledWorkoutsFromDB,
  saveScheduledWorkoutToDB,
  deleteScheduledWorkoutFromDB,
} from '@/lib/db';
import { addDays, isBefore, isAfter, isSameDay, parseISO, format } from 'date-fns';

export interface ExpandedScheduledWorkout extends ScheduledWorkout {
  displayDate: string; // The actual date this instance appears on
}

export const useScheduledWorkouts = () => {
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load scheduled workouts from IndexedDB
  const loadScheduledWorkouts = useCallback(async () => {
    try {
      setIsLoading(true);
      const dbScheduledWorkouts = await getAllScheduledWorkoutsFromDB();
      setScheduledWorkouts(dbScheduledWorkouts);
      setError(null);
    } catch (err) {
      console.error('Failed to load scheduled workouts:', err);
      setError('Failed to load scheduled workouts');
      setScheduledWorkouts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScheduledWorkouts();
  }, [loadScheduledWorkouts]);

  // Create a new scheduled workout
  const createScheduledWorkout = useCallback(async (
    data: Omit<ScheduledWorkout, 'id' | 'createdAt'>
  ): Promise<ScheduledWorkout> => {
    const newScheduledWorkout: ScheduledWorkout = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    await saveScheduledWorkoutToDB(newScheduledWorkout);
    setScheduledWorkouts(prev => [...prev, newScheduledWorkout]);

    return newScheduledWorkout;
  }, []);

  // Update an existing scheduled workout
  const updateScheduledWorkout = useCallback(async (
    id: string,
    updates: Partial<ScheduledWorkout>
  ): Promise<ScheduledWorkout | null> => {
    const existing = scheduledWorkouts.find(sw => sw.id === id);
    if (!existing) return null;

    const updated: ScheduledWorkout = { ...existing, ...updates };
    await saveScheduledWorkoutToDB(updated);
    setScheduledWorkouts(prev => prev.map(sw => sw.id === id ? updated : sw));

    return updated;
  }, [scheduledWorkouts]);

  // Delete a scheduled workout
  const deleteScheduledWorkout = useCallback(async (id: string): Promise<ScheduledWorkout | null> => {
    const toDelete = scheduledWorkouts.find(sw => sw.id === id);
    if (!toDelete) return null;

    await deleteScheduledWorkoutFromDB(id);
    setScheduledWorkouts(prev => prev.filter(sw => sw.id !== id));

    return toDelete;
  }, [scheduledWorkouts]);

  // Get scheduled workouts for a specific date range (expands recurrence)
  const getScheduledWorkoutsForRange = useCallback((
    startDate: Date,
    endDate: Date
  ): ExpandedScheduledWorkout[] => {
    const expanded: ExpandedScheduledWorkout[] = [];

    scheduledWorkouts.forEach(sw => {
      const scheduleStartDate = parseISO(sw.startDate);
      const scheduleEndDate = sw.endRecurrenceDate ? parseISO(sw.endRecurrenceDate) : null;

      if (sw.recurrence === 'none') {
        // One-time event - check if it falls within range
        if (
          (isSameDay(scheduleStartDate, startDate) || isAfter(scheduleStartDate, startDate)) &&
          (isSameDay(scheduleStartDate, endDate) || isBefore(scheduleStartDate, endDate))
        ) {
          expanded.push({ ...sw, displayDate: sw.startDate });
        }
      } else if (sw.recurrence === 'daily') {
        // Daily recurrence
        let currentDate = isBefore(scheduleStartDate, startDate) ? startDate : scheduleStartDate;
        
        while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
          // Check if we're past the end recurrence date
          if (scheduleEndDate && isAfter(currentDate, scheduleEndDate)) break;
          
          // Check if we're on or after the start date
          if (isSameDay(currentDate, scheduleStartDate) || isAfter(currentDate, scheduleStartDate)) {
            expanded.push({
              ...sw,
              displayDate: format(currentDate, 'yyyy-MM-dd')
            });
          }
          
          currentDate = addDays(currentDate, 1);
        }
      } else if (sw.recurrence === 'weekly' && sw.recurrenceDay) {
        // Weekly recurrence on specific day
        let currentDate = isBefore(scheduleStartDate, startDate) ? startDate : scheduleStartDate;
        
        while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
          // Check if we're past the end recurrence date
          if (scheduleEndDate && isAfter(currentDate, scheduleEndDate)) break;
          
          // Check if it's the right day of the week and on or after start
          const dayOfWeek = getDayOfWeek(currentDate);
          if (
            dayOfWeek === sw.recurrenceDay &&
            (isSameDay(currentDate, scheduleStartDate) || isAfter(currentDate, scheduleStartDate))
          ) {
            expanded.push({
              ...sw,
              displayDate: format(currentDate, 'yyyy-MM-dd')
            });
          }
          
          currentDate = addDays(currentDate, 1);
        }
      }
    });

    // Sort by date and time
    expanded.sort((a, b) => {
      const dateCompare = a.displayDate.localeCompare(b.displayDate);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });

    return expanded;
  }, [scheduledWorkouts]);

  // Get scheduled workouts for a specific date
  const getScheduledWorkoutsForDate = useCallback((date: Date): ExpandedScheduledWorkout[] => {
    return getScheduledWorkoutsForRange(date, date);
  }, [getScheduledWorkoutsForRange]);

  return {
    scheduledWorkouts,
    isLoading,
    error,
    createScheduledWorkout,
    updateScheduledWorkout,
    deleteScheduledWorkout,
    getScheduledWorkoutsForRange,
    getScheduledWorkoutsForDate,
    refreshScheduledWorkouts: loadScheduledWorkouts
  };
};

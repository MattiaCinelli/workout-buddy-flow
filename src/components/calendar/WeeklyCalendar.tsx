import React from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react';
import { ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { WorkoutEntry } from '@/data/workoutHistory';
import { cn } from '@/lib/utils';

interface WeeklyCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  scheduledWorkouts: ExpandedScheduledWorkout[];
  workouts: WorkoutEntry[];
  onAddClick: (date: Date) => void;
  onScheduleClick: (schedule: ExpandedScheduledWorkout) => void;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  currentDate,
  onDateChange,
  scheduledWorkouts,
  workouts,
  onAddClick,
  onScheduleClick,
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getWorkoutById = (id: string) => workouts.find(w => w.id === id);

  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduledWorkouts.filter(sw => sw.displayDate === dateStr);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'strength':
        return 'bg-workout-blue/20 border-workout-blue text-workout-blue';
      case 'cardio':
        return 'bg-workout-red/20 border-workout-red text-workout-red';
      case 'flexibility':
        return 'bg-workout-green/20 border-workout-green text-workout-green';
      case 'balance':
        return 'bg-purple-500/20 border-purple-500 text-purple-600';
      case 'warm-up':
        return 'bg-workout-orange/20 border-workout-orange text-workout-orange';
      default:
        return 'bg-muted border-muted-foreground/40 text-muted-foreground';
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = addDays(currentDate, direction === 'prev' ? -7 : 7);
    onDateChange(newDate);
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h2>
        <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const schedules = getSchedulesForDate(day);
          const dayIsToday = isToday(day);

          return (
            <Card
              key={day.toISOString()}
              className={cn(
                "min-h-[180px] p-2 flex flex-col",
                dayIsToday && "ring-2 ring-workout-blue"
              )}
            >
              {/* Day Header */}
              <div className="text-center mb-2">
                <div className="text-xs text-muted-foreground uppercase">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    "text-lg font-medium rounded-full w-8 h-8 flex items-center justify-center mx-auto",
                    dayIsToday && "bg-workout-blue text-white"
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>

              {/* Scheduled Workouts */}
              <div className="flex-1 space-y-1 overflow-y-auto">
                {schedules.map((schedule) => {
                  const workout = getWorkoutById(schedule.workoutId);
                  if (!workout) return null;

                  return (
                    <button
                      key={`${schedule.id}-${schedule.displayDate}`}
                      onClick={() => onScheduleClick(schedule)}
                      className={cn(
                        "w-full text-left p-1.5 rounded border text-xs transition-colors hover:opacity-80",
                        getCategoryColor(workout.category), schedule.skipped && "line-through opacity-50"
                      )}
                      aria-label={`${workout.title}${schedule.skipped ? ', skipped' : ''}`}
                    >
                      <div className="font-medium truncate flex items-center gap-1">
                        {schedule.recurrence !== 'none' && <Repeat className="h-2.5 w-2.5 flex-shrink-0" />}
                        <span className="truncate">{workout.title}</span>
                      </div>
                      <div className="text-[10px] opacity-70">{schedule.startTime}</div>
                    </button>
                  );
                })}
              </div>

              {/* Add Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 h-7 text-xs"
                onClick={() => onAddClick(day)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyCalendar;

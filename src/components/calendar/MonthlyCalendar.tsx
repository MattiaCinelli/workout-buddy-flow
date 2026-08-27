import React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isToday,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react';
import { ExpandedScheduledWorkout } from '@/hooks/useScheduledWorkouts';
import { WorkoutEntry } from '@/data/workoutHistory';
import { cn } from '@/lib/utils';

interface MonthlyCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  scheduledWorkouts: ExpandedScheduledWorkout[];
  workouts: WorkoutEntry[];
  onAddClick: (date: Date) => void;
  onScheduleClick: (schedule: ExpandedScheduledWorkout) => void;
}

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  currentDate,
  onDateChange,
  scheduledWorkouts,
  workouts,
  onAddClick,
  onScheduleClick,
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const getWorkoutById = (id: string) => workouts.find(w => w.id === id);

  const getSchedulesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduledWorkouts.filter(sw => sw.displayDate === dateStr);
  };

  const getCategoryDot = (category: string) => {
    switch (category) {
      case 'strength':
        return 'bg-workout-blue';
      case 'cardio':
        return 'bg-workout-red';
      case 'flexibility':
        return 'bg-workout-green';
      case 'balance':
        return 'bg-purple-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = addMonths(currentDate, direction === 'prev' ? -1 : 1);
    onDateChange(newDate);
  };

  // Generate calendar days
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const weekDayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-muted">
          {weekDayHeaders.map((dayName) => (
            <div
              key={dayName}
              className="p-2 text-center text-sm font-medium text-muted-foreground border-b"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((dayDate) => {
              const schedules = getSchedulesForDate(dayDate);
              const dayIsToday = isToday(dayDate);
              const isCurrentMonth = isSameMonth(dayDate, currentDate);

              return (
                <div
                  key={dayDate.toISOString()}
                  className={cn(
                    "min-h-[100px] p-1 border-b border-r last:border-r-0 flex flex-col",
                    !isCurrentMonth && "bg-muted/50"
                  )}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-sm w-6 h-6 flex items-center justify-center rounded-full",
                        dayIsToday && "bg-workout-blue text-white",
                        !isCurrentMonth && "text-muted-foreground"
                      )}
                    >
                      {format(dayDate, 'd')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
                      onClick={() => onAddClick(dayDate)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Scheduled Workouts */}
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {schedules.slice(0, 3).map((schedule) => {
                      const workout = getWorkoutById(schedule.workoutId);
                      if (!workout) return null;

                      return (
                        <button
                          key={`${schedule.id}-${schedule.displayDate}`}
                          onClick={() => onScheduleClick(schedule)}
                          className={cn("w-full flex items-center gap-1 text-left text-xs p-0.5 rounded hover:bg-muted transition-colors",
                            schedule.skipped && "line-through opacity-50")}
                          aria-label={`${workout.title}${schedule.skipped ? ', skipped' : ''}`}
                        >
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full flex-shrink-0",
                              getCategoryDot(workout.category)
                            )}
                          />
                          {schedule.recurrence !== 'none' && <Repeat className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground" />}
                          <span className="truncate">{workout.title}</span>
                        </button>
                      );
                    })}
                    {schedules.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-3">
                        +{schedules.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyCalendar;

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight, Clock, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { format, addDays, isSameDay, startOfToday } from 'date-fns';

interface CalendarPreviewProps {
  onStartWorkout?: (workoutId: string) => void;
}

const CalendarPreview: React.FC<CalendarPreviewProps> = ({ onStartWorkout }) => {
  const navigate = useNavigate();
  const { getScheduledWorkoutsForRange, getWorkoutById } = useData();
  
  const today = startOfToday();
  const weekEnd = addDays(today, 6);
  const weekSchedule = getScheduledWorkoutsForRange(today, weekEnd);
  
  // Group by date
  const scheduleByDate = weekSchedule.reduce((acc, item) => {
    const dateKey = item.displayDate;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, typeof weekSchedule>);
  
  // Generate days array for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5 text-primary" />
          This Week
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/calendar')}
          className="text-muted-foreground hover:text-foreground"
        >
          Full Calendar
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySchedule = scheduleByDate[dateKey] || [];
            const isToday = isSameDay(day, today);
            
            return (
              <div 
                key={idx}
                className={`min-h-[100px] rounded-lg border p-2 transition-colors ${
                  isToday 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg font-bold mb-2 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {daySchedule.slice(0, 2).map((scheduled, sIdx) => {
                    const workout = getWorkoutById(scheduled.workoutId);
                    return (
                      <div 
                        key={sIdx}
                        className="group relative"
                      >
                        <div className="flex items-center gap-1 p-1 rounded bg-secondary/50 hover:bg-secondary cursor-pointer text-xs"
                          onClick={() => onStartWorkout?.(scheduled.workoutId)}
                        >
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate flex-1 font-medium">
                            {workout?.title || 'Workout'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {daySchedule.length > 2 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{daySchedule.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarPreview;

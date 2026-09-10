import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock, Dumbbell, Zap, Calendar, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { startOfToday } from 'date-fns';
import { scheduledWorkoutSessionUrl } from '@/lib/workoutSessionUrl';
import { isScheduledOccurrenceCompleted } from '@/lib/scheduleCompletion';

const TodaysFocus: React.FC = () => {
  const navigate = useNavigate();
  const { getScheduledWorkoutsForDate, getWorkoutById, sessions } = useData();
  
  const today = startOfToday();
  const todaysWorkouts = getScheduledWorkoutsForDate(today).filter(schedule => !schedule.skipped);
  
  if (todaysWorkouts.length === 0) {
    return (
      <Card className="h-full border-dashed border-primary/20 bg-gradient-to-br from-card to-primary/[0.035]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Today's Focus
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-40 flex-col items-center justify-center pb-6 text-center">
          <div className="mb-3 rounded-xl bg-muted p-2.5">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-semibold">Rest day</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            No workouts scheduled for today
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/calendar')}
          >
            Schedule a Workout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-primary/20 bg-gradient-to-br from-card to-primary/[0.05]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Today's Focus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {todaysWorkouts.map((scheduled) => {
          const workout = getWorkoutById(scheduled.workoutId);
          if (!workout) return null;
          const completed = isScheduledOccurrenceCompleted(scheduled, sessions);
          
          return (
            <div 
              key={`${scheduled.id}-${scheduled.displayDate}`}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border shadow-sm ${
                completed ? 'border-workout-green/40 bg-workout-green/5' : 'bg-card'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${completed ? 'bg-workout-green/15' : 'bg-primary/10'}`}>
                  {completed
                    ? <CheckCircle2 className="completion-check h-4 w-4 text-workout-green" />
                    : <Dumbbell className="h-4 w-4 text-primary" />}
                </div>
                <div>
                  <h4 className="font-semibold">{workout.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{scheduled.startTime}</span>
                    <span>•</span>
                    <span>{workout.duration} min</span>
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                variant={completed ? 'outline' : 'default'}
                className="gap-1"
                disabled={completed}
                aria-label={completed ? `${workout.title} completed` : `Start ${workout.title}`}
                onClick={() => navigate(scheduledWorkoutSessionUrl(scheduled))}
              >
                {completed ? <CheckCircle2 className="completion-check h-4 w-4" /> : <Play className="h-4 w-4" />}
                {completed ? 'Done' : 'Start'}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TodaysFocus;

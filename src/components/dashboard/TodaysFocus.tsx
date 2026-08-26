import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock, Dumbbell, Zap, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { startOfToday } from 'date-fns';

const TodaysFocus: React.FC = () => {
  const navigate = useNavigate();
  const { getScheduledWorkoutsForDate, getWorkoutById } = useData();
  
  const today = startOfToday();
  const todaysWorkouts = getScheduledWorkoutsForDate(today);
  
  if (todaysWorkouts.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Rest Day</h3>
          <p className="text-sm text-muted-foreground mb-4">
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
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Today's Focus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {todaysWorkouts.map((scheduled, idx) => {
          const workout = getWorkoutById(scheduled.workoutId);
          if (!workout) return null;
          
          return (
            <div 
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-card border shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
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
                className="gap-1"
                onClick={() => navigate(`/workouts/${workout.id}/session`)}
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TodaysFocus;

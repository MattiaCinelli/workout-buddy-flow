
import React from 'react';
import WorkoutCard from './WorkoutCard';
import { WorkoutSession } from '@/data/workoutSessions';
import { CalendarDays } from 'lucide-react';

interface WorkoutHistoryProps {
  workouts: WorkoutSession[];
  showEmpty?: boolean;
}

const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({ 
  workouts, 
  showEmpty = true 
}) => {
  if (workouts.length === 0 && showEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="bg-muted rounded-full p-4 mb-4">
          <CalendarDays className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No workout history</h3>
        <p className="text-muted-foreground mt-1">
          Start tracking your workouts to see your progress over time
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
};

export default WorkoutHistory;

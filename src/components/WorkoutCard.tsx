import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronRight, Activity } from "lucide-react";
import { WorkoutSession } from '@/data/workoutSessions';
import { WorkoutEntry } from '@/data/workoutHistory';
import { exerciseList } from '@/data/exercises';
import { useNavigate } from 'react-router-dom';

interface WorkoutCardProps {
  workout: WorkoutSession | WorkoutEntry;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout }) => {
  const navigate = useNavigate();
  
  // Get unique exercises
  const uniqueExercises = [...new Set(workout.sets.map(set => set.exerciseId))];
  const exerciseCount = uniqueExercises.length;
  
  // Format date
  const formattedDate = new Date(workout.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  
  // Get category color
  const getCategoryColor = () => {
    switch (workout.category) {
      case 'strength': return 'bg-workout-blue text-white';
      case 'cardio': return 'bg-workout-red text-white';
      case 'flexibility': return 'bg-workout-purple text-white';
      case 'balance': return 'bg-workout-yellow text-black';
      case 'mixed': return 'bg-workout-green text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  // Get exercise names
  const getExercisePreview = () => {
    return uniqueExercises.slice(0, 2).map(id => {
      const exercise = exerciseList.find(ex => ex.id === id);
      return exercise?.name;
    }).join(', ');
  };

  const exercisePreview = getExercisePreview();
  const hasMoreExercises = uniqueExercises.length > 2;

  // Handle click to navigate to workout detail page
  const handleCardClick = () => {
    navigate(`/workout/${'workoutId' in workout ? workout.workoutId : workout.id}`);
  };

  return (
    <Card 
      className="workout-card overflow-hidden border-l-4 hover:shadow-lg cursor-pointer transition-all" 
      style={{ borderLeftColor: workout.category === 'strength' ? '#3B82F6' : 
                               workout.category === 'cardio' ? '#EF4444' :
                               workout.category === 'flexibility' ? '#8B5CF6' :
                               workout.category === 'balance' ? '#F59E0B' : '#10B981' }}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold">{workout.title}</CardTitle>
          <Badge className={`${getCategoryColor()} capitalize`}>
            {workout.category}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="text-muted-foreground text-sm">
          {exercisePreview}
          {hasMoreExercises ? ` and ${uniqueExercises.length - 2} more` : ''}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between items-center text-sm text-muted-foreground">
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{workout.duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            <span>{exerciseCount} exercises</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4" />
      </CardFooter>
    </Card>
  );
};

export default WorkoutCard;

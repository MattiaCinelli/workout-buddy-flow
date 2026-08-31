import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronRight, Activity, Pencil, Trash2, Star } from "lucide-react";
import { WorkoutSession } from '@/data/workoutSessions';
import { WorkoutEntry } from '@/data/workoutHistory';
import { useNavigate } from 'react-router-dom';

interface WorkoutCardProps {
  workout: WorkoutSession | WorkoutEntry;
  // Only wired for history entries (WorkoutSession) — workout templates
  // have their own delete flow (Workouts page) with its own referential
  // integrity checks, so this stays opt-in per usage rather than global.
  onDelete?: (workout: WorkoutSession | WorkoutEntry) => void;
  onEdit?: (workout: WorkoutSession | WorkoutEntry) => void;
  // Only meaningful for workout templates, not history entries — wired in
  // from the Workouts page only.
  onToggleFavorite?: (workout: WorkoutEntry) => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout, onDelete, onEdit, onToggleFavorite }) => {
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
      case 'warm-up': return 'bg-workout-orange text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Handle click to navigate to workout detail page
  const handleCardClick = () => {
    navigate(`/workouts/${'workoutId' in workout ? workout.workoutId : workout.id}`);
  };

  return (
    <Card 
      className="workout-card overflow-hidden border-l-4 hover:shadow-lg cursor-pointer transition-all" 
      style={{ borderLeftColor: workout.category === 'strength' ? '#3B82F6' :
                               workout.category === 'cardio' ? '#EF4444' :
                               workout.category === 'flexibility' ? '#8B5CF6' :
                               workout.category === 'balance' ? '#F59E0B' :
                               workout.category === 'warm-up' ? '#F97316' : '#10B981' }}
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCardClick();
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-amber-500"
                onClick={e => { e.stopPropagation(); onToggleFavorite(workout as WorkoutEntry); }}
                aria-label={workout.favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`h-4 w-4 ${workout.favorite ? 'fill-amber-400 text-amber-500' : ''}`} />
              </Button>
            )}
            <CardTitle className="text-lg font-bold truncate">{workout.title}</CardTitle>
          </div>
          <Badge className={`${getCategoryColor()} capitalize shrink-0`}>
            {workout.category}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="text-muted-foreground text-sm line-clamp-2">
          {workout.description || `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}`}
        </div>
        {'actualSets' in workout && workout.actualSets && (
          <div className="mt-2 text-sm">
            {workout.actualSets.filter(set => set.completed).length}/{workout.actualSets.length} sets completed
          </div>
        )}
        {'perceivedExertion' in workout && workout.perceivedExertion && (
          <div className="mt-1 text-sm">RPE {workout.perceivedExertion}/10</div>
        )}
        {'completionNotes' in workout && workout.completionNotes && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{workout.completionNotes}</p>
        )}
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
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
              onClick={event => { event.stopPropagation(); onEdit(workout); }} aria-label="Correct history record">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={e => { e.stopPropagation(); onDelete(workout); }}
              aria-label="Delete from history"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <ChevronRight className="h-4 w-4" />
        </div>
      </CardFooter>
    </Card>
  );
};

export default WorkoutCard;

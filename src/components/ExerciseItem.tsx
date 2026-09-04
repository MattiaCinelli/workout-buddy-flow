
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Exercise, getLogType, getExecutionDirections, EXECUTION_DIRECTION_LABELS } from '@/data/exercises';
import { Image, Edit, Repeat, Timer } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';
import { exerciseCategoryTint } from '@/lib/exerciseCategory';

interface ExerciseItemProps {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, onSelect, onEdit }) => {
  const { muscleGroups } = useData();
  const muscleGroupNames = exercise.muscleGroups
    .map(id => muscleGroups.find(group => group.id === id)?.name ?? id)
    .join(', ');

  const logType = getLogType(exercise);
  const sets = exercise.defaultSets ?? 1;
  const setSummary = logType === 'time'
    ? (exercise.defaultDuration ? `${sets} × ${exercise.defaultDuration}s` : `${sets} set${sets === 1 ? '' : 's'}`)
    : (exercise.defaultReps ? `${sets} × ${exercise.defaultReps} reps` : `${sets} set${sets === 1 ? '' : 's'}`);

  const getCategoryColor = () => {
    switch (exercise.category) {
      case 'strength': return 'bg-workout-blue text-white hover:bg-workout-blue/90';
      case 'cardio': return 'bg-workout-red text-white hover:bg-workout-red/90';
      case 'flexibility': return 'bg-workout-purple text-white hover:bg-workout-purple/90';
      case 'balance': return 'bg-workout-yellow text-black hover:bg-workout-yellow/90';
      default: return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const getDifficultyColor = () => {
    switch (exercise.difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(exercise);
  };

  return (
    <div
      className={cn(
        'exercise-item p-4 border rounded-lg hover:shadow-md transition-shadow',
        exerciseCategoryTint(exercise.category),
        onSelect && 'cursor-pointer',
      )}
      onClick={() => onSelect && onSelect(exercise)}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          {exercise.imageUrl ? (
            <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
              <img 
                src={exercise.imageUrl} 
                alt={exercise.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <Image className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-grow">
            <h3 className="font-medium">{exercise.name}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              {logType === 'time' ? <Timer className="h-3 w-3" /> : <Repeat className="h-3 w-3" />}
              {setSummary}
              {getExecutionDirections(exercise).length > 0 && (
                <span className="font-medium text-workout-green">
                  · {getExecutionDirections(exercise).map(direction => EXECUTION_DIRECTION_LABELS[direction]).join(' / ')} sets
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {muscleGroupNames}
            </div>
            {exercise.instructions && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {exercise.instructions}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 items-end">
          <Badge className={getCategoryColor()}>
            {exercise.category}
          </Badge>
          <Badge variant="outline" className={getDifficultyColor()}>
            {exercise.difficulty}
          </Badge>
          {onEdit && (
            <Button 
              onClick={handleEdit}
              variant="outline"
              size="sm"
              className="mt-1"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseItem;

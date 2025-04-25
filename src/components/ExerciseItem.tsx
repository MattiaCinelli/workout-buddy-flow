
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Exercise } from '@/data/exercises';

interface ExerciseItemProps {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, onSelect }) => {
  const getCategoryColor = () => {
    switch (exercise.category) {
      case 'strength': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'cardio': return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'flexibility': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'balance': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };
  
  const getDifficultyColor = () => {
    switch (exercise.difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className={`exercise-item p-4 border rounded-lg ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect && onSelect(exercise)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{exercise.name}</h3>
          <div className="text-sm text-muted-foreground mt-1">
            {exercise.muscleGroups.join(', ')}
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Badge className={getCategoryColor()}>
            {exercise.category}
          </Badge>
          <Badge variant="outline" className={getDifficultyColor()}>
            {exercise.difficulty}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default ExerciseItem;

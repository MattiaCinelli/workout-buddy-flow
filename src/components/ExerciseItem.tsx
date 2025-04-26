
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Exercise } from '@/data/exercises';
import { Image, Edit } from 'lucide-react';

interface ExerciseItemProps {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, onSelect, onEdit }) => {
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

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(exercise);
  };

  return (
    <div 
      className={`exercise-item p-4 border rounded-lg hover:shadow-md transition-shadow ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect && onSelect(exercise)}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          {exercise.imageUrl ? (
            <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
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
            <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          <div className="flex-grow">
            <h3 className="font-medium">{exercise.name}</h3>
            <div className="text-sm text-muted-foreground mt-1">
              {exercise.muscleGroups.join(', ')}
            </div>
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

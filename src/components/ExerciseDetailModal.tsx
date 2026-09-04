import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Loader2, Pencil, Repeat, Share2, Timer, TrendingUp, Video } from 'lucide-react';
import { Exercise, getLogType, getExecutionDirections, EXECUTION_DIRECTION_LABELS } from '@/data/exercises';
import { shareExercise } from '@/lib/backup';
import { useData } from '@/contexts/DataContext';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  onClose: () => void;
  onEdit: (exercise: Exercise) => void;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'strength': return 'bg-workout-blue text-white hover:bg-workout-blue/90';
    case 'cardio': return 'bg-workout-red text-white hover:bg-workout-red/90';
    case 'flexibility': return 'bg-workout-purple text-white hover:bg-workout-purple/90';
    case 'balance': return 'bg-workout-yellow text-black hover:bg-workout-yellow/90';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    default: return 'bg-muted text-muted-foreground';
  }
};

// Read-only "what is this exercise" view, distinct from ExerciseForm's edit
// dialog — clicking an exercise card should let you read it, not
// immediately drop you into editing it.
export function ExerciseDetailModal({ exercise, onClose, onEdit }: ExerciseDetailModalProps) {
  const { muscleGroups } = useData();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!exercise) return;
    setSharing(true);
    try {
      await shareExercise(exercise, muscleGroups);
    } catch (error) {
      console.error('Failed to share exercise:', error);
      toast.error('Could not share this exercise.');
    } finally {
      setSharing(false);
    }
  };

  if (!exercise) return null;

  const logType = getLogType(exercise);
  const muscleGroupNames = exercise.muscleGroups
    .map(id => muscleGroups.find(group => group.id === id)?.name ?? id)
    .join(', ');

  const setSummary = () => {
    const sets = exercise.defaultSets ?? 1;
    const setLabel = `${sets} set${sets === 1 ? '' : 's'}`;
    if (logType === 'time') {
      return exercise.defaultDuration ? `${setLabel} × ${exercise.defaultDuration}s` : setLabel;
    }
    return exercise.defaultReps ? `${setLabel} × ${exercise.defaultReps} reps` : setLabel;
  };

  return (
    <Dialog open={!!exercise} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {exercise.name}
            <Badge className={getCategoryColor(exercise.category)}>{exercise.category}</Badge>
            <Badge variant="outline" className={getDifficultyColor(exercise.difficulty)}>{exercise.difficulty}</Badge>
            {getExecutionDirections(exercise).length > 0 && (
              <Badge variant="outline" className="border-workout-green/50 text-workout-green">
                {getExecutionDirections(exercise).map(direction => EXECUTION_DIRECTION_LABELS[direction]).join(' / ')} sets
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{muscleGroupNames || 'No muscle groups tagged'}</DialogDescription>
        </DialogHeader>

        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.name}
            className="w-full max-h-64 object-contain rounded-md bg-muted"
          />
        ) : (
          <div className="w-full h-32 rounded-md bg-muted flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        <div className="flex items-center gap-2 text-sm font-medium">
          {logType === 'time' ? <Timer className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          {setSummary()}
          {exercise.defaultWeight ? <span className="text-muted-foreground font-normal">· {exercise.defaultWeight}kg</span> : null}
          {exercise.defaultDistance ? <span className="text-muted-foreground font-normal">· {exercise.defaultDistance}m</span> : null}
        </div>

        {exercise.videoUrl && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Video className="h-4 w-4" /> Watch demonstration video
          </a>
        )}

        {exercise.instructions && (
          <div className="pt-1 border-t">
            <p className="text-xs text-muted-foreground mt-3 mb-1">Instructions</p>
            <p className="text-sm">{exercise.instructions}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="sm:mr-auto" onClick={() => { onClose(); navigate(`/exercises/${exercise.id}/progress`); }}>
            <TrendingUp className="h-4 w-4 mr-2" /> Progress
          </Button>
          <Button variant="outline" onClick={handleShare} disabled={sharing}>
            {sharing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />} Share
          </Button>
          <Button variant="outline" onClick={() => onEdit(exercise)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

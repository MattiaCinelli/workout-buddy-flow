import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Loader2, Pencil, Play, Repeat, Share2, Timer, TrendingUp, Video, ZoomIn } from 'lucide-react';
import { Exercise, getLogType, getExecutionDirections, EXECUTION_DIRECTION_LABELS } from '@/data/exercises';
import { shareExercise } from '@/lib/backup';
import { useData } from '@/contexts/DataContext';
import ExerciseImage from '@/components/ExerciseImage';

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
  const [imageOpen, setImageOpen] = useState(false);

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
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:max-w-[640px] sm:rounded-lg sm:border [&>button]:right-[max(1rem,var(--app-safe-area-right))] [&>button]:top-[max(1rem,var(--app-safe-area-top))] sm:[&>button]:right-4 sm:[&>button]:top-4">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-[max(3.5rem,calc(var(--app-safe-area-top)+3rem))] sm:px-6 sm:pb-4 sm:pt-6">
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

        {!!exercise.aliases?.length && (
          <p className="text-sm text-muted-foreground">
            Also known as: {exercise.aliases.join(', ')}
          </p>
        )}

        {exercise.imageUrl ? (
          <button
            type="button"
            onClick={() => setImageOpen(true)}
            className="group relative w-full overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`View ${exercise.name} image full screen`}
          >
            <ExerciseImage
              imageUrl={exercise.imageUrl}
              alt={exercise.name}
              className="max-h-64 w-full cursor-zoom-in object-contain"
            />
            <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white shadow-md transition-transform group-hover:scale-105" aria-hidden="true">
              <ZoomIn className="h-4 w-4" />
            </span>
          </button>
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
        </div>

        <DialogFooter data-exercise-actions className="grid shrink-0 grid-cols-2 gap-2 space-x-0 border-t bg-card px-4 py-3 pb-[max(.75rem,var(--app-safe-area-bottom))] [&>button]:min-w-0 [&>button]:w-full [&>button]:px-2 [&>button]:text-sm sm:grid-cols-2 sm:space-x-0 sm:px-6 sm:pb-6 sm:pt-3">
          <Button variant="outline" onClick={() => { onClose(); navigate(`/exercises/${exercise.id}/progress`); }}>
            <TrendingUp className="h-4 w-4 mr-2" /> Progress
          </Button>
          <Button variant="outline" onClick={handleShare} disabled={sharing}>
            {sharing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />} Share
          </Button>
          <Button variant="outline" onClick={() => onEdit(exercise)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button onClick={() => { onClose(); navigate(`/exercises/${exercise.id}/try`); }}>
            <Play className="h-4 w-4 mr-2" /> Try exercise
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="flex h-[100dvh] w-screen max-w-none items-center justify-center overflow-hidden rounded-none border-0 bg-black/95 px-[max(1rem,var(--app-safe-area-left))] pb-[max(1rem,var(--app-safe-area-bottom))] pt-[max(1rem,var(--app-safe-area-top))] shadow-none [&>button]:right-[max(1rem,var(--app-safe-area-right))] [&>button]:top-[max(1rem,var(--app-safe-area-top))] [&>button]:z-10 [&>button]:bg-black/65 [&>button]:p-2 [&>button]:text-white [&>button]:opacity-100">
          <DialogTitle className="sr-only">{exercise.name} image</DialogTitle>
          <DialogDescription className="sr-only">Full-screen exercise image. Press Back or Close to return to the exercise details.</DialogDescription>
          <ExerciseImage
            imageUrl={exercise.imageUrl}
            alt={`${exercise.name} — full screen`}
            className="max-h-full max-w-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

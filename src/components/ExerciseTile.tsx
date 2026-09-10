import { Edit, Image, Repeat, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ExerciseImage from '@/components/ExerciseImage';
import { Exercise, getLogType } from '@/data/exercises';
import { useData } from '@/contexts/DataContext';
import { exerciseCategoryTint } from '@/lib/exerciseCategory';
import { cn } from '@/lib/utils';

interface ExerciseTileProps {
  exercise: Exercise;
  onSelect: (exercise: Exercise) => void;
  onEdit: (exercise: Exercise) => void;
}

const ExerciseTile = ({ exercise, onSelect, onEdit }: ExerciseTileProps) => {
  const { muscleGroups } = useData();
  const muscleNames = exercise.muscleGroups
    .map(id => muscleGroups.find(group => group.id === id)?.name ?? id)
    .join(', ');
  const logType = getLogType(exercise);
  const sets = exercise.defaultSets ?? 1;
  const target = logType === 'time'
    ? exercise.defaultDuration ? `${sets} × ${exercise.defaultDuration}s` : `${sets} set${sets === 1 ? '' : 's'}`
    : exercise.defaultReps ? `${sets} × ${exercise.defaultReps} reps` : `${sets} set${sets === 1 ? '' : 's'}`;

  return (
    <article className={cn(
      'group relative min-w-0 overflow-hidden rounded-lg border transition-shadow hover:shadow-md',
      exerciseCategoryTint(exercise.category),
    )}>
      <button
        type="button"
        className="flex h-full w-full min-w-0 flex-col p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:p-3"
        onClick={() => onSelect(exercise)}
        aria-label={`View ${exercise.name}`}
      >
        <div className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-md bg-muted sm:h-24">
          {exercise.imageUrl
            ? <ExerciseImage imageUrl={exercise.imageUrl} alt="" className="h-full w-full object-cover" />
            : <Image className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
        </div>
        <h3 className="line-clamp-2 min-h-10 w-full text-sm font-semibold leading-5">{exercise.name}</h3>
        <div className="mt-1 flex max-w-full flex-wrap gap-1">
          <Badge variant="secondary" className="h-5 max-w-full px-1.5 text-[10px] capitalize">{exercise.category}</Badge>
          <Badge variant="outline" className="h-5 max-w-full px-1.5 text-[10px] capitalize">{exercise.difficulty}</Badge>
        </div>
        <p className="mt-2 w-full truncate text-xs text-muted-foreground">{muscleNames || 'No muscle group'}</p>
        <div className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
          {logType === 'time' ? <Timer className="h-3 w-3" /> : <Repeat className="h-3 w-3" />}
          <span className="truncate">{target}</span>
        </div>
      </button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute right-4 top-4 h-7 w-7 shadow-sm"
        onClick={() => onEdit(exercise)}
        aria-label={`Edit ${exercise.name}`}
      >
        <Edit className="h-3.5 w-3.5" />
      </Button>
    </article>
  );
};

export default ExerciseTile;

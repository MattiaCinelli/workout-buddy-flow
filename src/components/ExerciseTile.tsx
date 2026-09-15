import { Edit, Image, Repeat, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ExerciseImage from '@/components/ExerciseImage';
import { Exercise, getLogType, type ExerciseVariation } from '@/data/exercises';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';
import CardStack from '@/components/CardStack';

interface ExerciseTileProps {
  exercise: Exercise;
  onSelect: (exercise: Exercise) => void;
  onEdit: (exercise: Exercise) => void;
  onSelectVariation?: (exercise: Exercise, variation: ExerciseVariation) => void;
  expandVariations?: boolean;
}

const ExerciseTile = ({ exercise, onSelect, onEdit, onSelectVariation, expandVariations = false }: ExerciseTileProps) => {
  const { muscleGroups } = useData();
  const muscleNames = exercise.muscleGroups
    .map(id => muscleGroups.find(group => group.id === id)?.name ?? id)
    .join(', ');
  const logType = getLogType(exercise);
  const sets = exercise.defaultSets ?? 1;
  const target = logType === 'time'
    ? exercise.defaultDuration ? `${sets} × ${exercise.defaultDuration}s` : `${sets} set${sets === 1 ? '' : 's'}`
    : exercise.defaultReps ? `${sets} × ${exercise.defaultReps} reps` : `${sets} set${sets === 1 ? '' : 's'}`;
  const categoryAccent = {
    strength: 'border-t-workout-blue',
    cardio: 'border-t-workout-red',
    flexibility: 'border-t-workout-purple',
    balance: 'border-t-workout-yellow',
  }[exercise.category] ?? 'border-t-primary';

  return (
    <CardStack count={exercise.variations?.length ?? 0} label="variation" forceExpanded={expandVariations} front={
    <article className={cn(
      'group relative min-w-0 overflow-hidden rounded-lg border border-t-[3px] bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-x-primary/15 hover:border-b-primary/15 hover:shadow-md',
      categoryAccent,
    )}>
      <button
        type="button"
        className="flex h-full w-full min-w-0 flex-col p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:p-3"
        onClick={() => onSelect(exercise)}
        aria-label={`View ${exercise.name}`}
      >
        <div className="mb-3 flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border bg-slate-50 dark:bg-muted sm:h-28">
          {exercise.imageUrl
            ? <ExerciseImage imageUrl={exercise.imageUrl} alt="" className="h-full w-full object-cover" />
            : <Image className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
        </div>
        <h3 className="line-clamp-2 min-h-10 w-full text-sm font-semibold leading-5 tracking-tight">{exercise.name}</h3>
        <div className="mt-1 flex max-w-full flex-wrap gap-1">
          <Badge variant="secondary" className="h-5 max-w-full px-1.5 text-[10px] capitalize">{exercise.category}</Badge>
          <Badge variant="outline" className="h-5 max-w-full px-1.5 text-[10px] capitalize">{exercise.difficulty}</Badge>
        </div>
        <p className="mt-2 w-full truncate text-xs text-muted-foreground">{muscleNames || 'No muscle group'}</p>
        {!!exercise.equipment?.length && (
          <p className="mt-1 w-full truncate text-[11px] font-medium text-primary">{exercise.equipment.join(' · ')}</p>
        )}
        <div className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted-foreground">
          {logType === 'time' ? <Timer className="h-3 w-3" /> : <Repeat className="h-3 w-3" />}
          <span className="truncate">{target}</span>
        </div>
      </button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute right-4 top-4 h-7 w-7 border-white/50 bg-card/90 opacity-100 shadow-sm backdrop-blur sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        onClick={() => onEdit(exercise)}
        aria-label={`Edit ${exercise.name}`}
      >
        <Edit className="h-3.5 w-3.5" />
      </Button>
    </article>}>
    {!!exercise.variations?.length && exercise.variations.map((variation, index) => <button key={variation.id} type="button" className="flex w-full items-center gap-2 rounded-md border bg-card p-1.5 text-left hover:border-primary/40" onClick={() => onSelectVariation?.(exercise, variation)}><div className="flex h-9 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">{variation.imageUrl ? <ExerciseImage imageUrl={variation.imageUrl} alt="" className="h-full w-full object-cover" /> : <Image className="h-4 w-4 text-muted-foreground" />}</div><div className="min-w-0"><p className="truncate text-xs font-medium">{variation.name}</p><p className="text-[10px] capitalize text-muted-foreground">Level {index + 1} · {variation.difficulty}</p></div></button>)}
    </CardStack>
  );
};

export default ExerciseTile;

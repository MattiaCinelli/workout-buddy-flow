import { useMemo, useState } from 'react';
import { ChevronDown, ImageIcon } from 'lucide-react';
import type { Exercise } from '@/data/exercises';
import { EXECUTION_DIRECTION_LABELS } from '@/data/exercises';
import type { WorkoutEntry, WorkoutSet } from '@/data/workoutHistory';
import ExerciseImage from '@/components/ExerciseImage';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ExerciseBlock {
  key: string;
  exerciseId: string;
  sets: WorkoutSet[];
}

const exerciseBlocks = (sets: WorkoutSet[]): ExerciseBlock[] => {
  const blocks: ExerciseBlock[] = [];
  const byKey = new Map<string, ExerciseBlock>();
  for (const set of sets) {
    // New workouts use occurrenceId, so the same exercise can appear twice as
    // two independently configured blocks. Legacy workouts safely group by
    // exercise id because they could not contain duplicate blocks.
    const key = set.occurrenceId ?? `legacy:${set.exerciseId}`;
    let block = byKey.get(key);
    if (!block) {
      block = { key, exerciseId: set.exerciseId, sets: [] };
      byKey.set(key, block);
      blocks.push(block);
    }
    block.sets.push(set);
  }
  return blocks;
};

const setTarget = (set: WorkoutSet): string => {
  const parts: string[] = [];
  if (set.amrap) parts.push(set.reps ? `${set.reps}+ reps AMRAP` : 'AMRAP');
  else if (set.reps !== undefined) parts.push(`${set.reps} reps`);
  if (set.duration !== undefined) parts.push(`${set.duration}s`);
  if (set.weight !== undefined) parts.push(`${set.weight} kg`);
  if (set.distance !== undefined) parts.push(`${set.distance} m`);
  return parts.join(' · ') || 'Target not set';
};

const blockSummary = (sets: WorkoutSet[]): string => {
  const targets = [...new Set(sets.map(setTarget))];
  const directions = [...new Set(sets.map(set => set.direction)
    .filter((direction): direction is Exclude<WorkoutSet['direction'], 'none' | undefined> => !!direction && direction !== 'none'))]
    .map(direction => EXECUTION_DIRECTION_LABELS[direction]);
  const setCount = `${sets.length} set${sets.length === 1 ? '' : 's'}`;
  const target = targets.length === 1 ? ` × ${targets[0]}` : ` · ${targets.slice(0, 3).join(' / ')}${targets.length > 3 ? ' / …' : ''}`;
  return `${setCount}${target}${directions.length ? ` · ${directions.join(', ')}` : ''}`;
};

interface CourseWorkoutPreviewProps {
  workout: WorkoutEntry;
  getExerciseById: (id: string) => Exercise | undefined;
}

export function CourseWorkoutPreview({ workout, getExerciseById }: CourseWorkoutPreviewProps) {
  const [open, setOpen] = useState(false);
  const blocks = useMemo(() => exerciseBlocks(workout.sets), [workout.sets]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3 border-t pt-2">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-full justify-between px-2 text-muted-foreground">
          <span>Preview exercises ({blocks.length})</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {blocks.length === 0 ? (
          <p className="px-2 pb-2 pt-1 text-sm text-muted-foreground">This workout has no exercises yet.</p>
        ) : (
          <ol className="space-y-2 px-2 pb-2 pt-1">
            {blocks.map((block, index) => {
              const exercise = getExerciseById(block.exerciseId);
              return (
                <li key={block.key} className="flex items-center gap-3 rounded-md bg-muted/40 p-2">
                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">{index + 1}</span>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {exercise?.imageUrl ? (
                      <ExerciseImage imageUrl={exercise.imageUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{exercise?.name ?? 'Missing exercise'}</p>
                    <p className="text-xs text-muted-foreground">{blockSummary(block.sets)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}


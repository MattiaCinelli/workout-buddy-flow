import { HTMLAttributes, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, GripVertical, ImageIcon, Info, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ExerciseImage from '@/components/ExerciseImage';
import { UnilateralSetNote } from '@/components/UnilateralSetNote';
import { Exercise, getExecutionDirections, getExerciseImageUrl, getLogType } from '@/data/exercises';
import { WorkoutSet } from '@/data/workoutHistory';
import { WORKOUT_SET_DIRECTIONS, workoutDirectionLabel } from '@/lib/workoutDirections';
import { cn } from '@/lib/utils';
import { summarizeSets } from '@/lib/workoutSetSummary';

export interface SelectedExercise {
  occurrenceId: string;
  exercise: Exercise;
  sets: WorkoutSet[];
}

interface SelectedExerciseCardProps {
  selected: SelectedExercise;
  index: number;
  count: number;
  disabled?: boolean;
  dragging?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  /** Set lists start closed so a long workout stays scannable; the summary line shows what is planned. */
  defaultExpanded?: boolean;
  restBetweenSets: number;
  restBetweenExercises: number;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onShowInstructions?: () => void;
  onPatchSet: (setIndex: number, patch: Partial<WorkoutSet>) => void;
  onRemoveSet: (setIndex: number) => void;
  onAddSet: () => void;
}

const numberFrom = (value: string) => (value ? Number(value) : undefined);

export const SelectedExerciseCard = ({
  selected, index, count, disabled, dragging, dragHandleProps, defaultExpanded = false,
  restBetweenSets, restBetweenExercises, onMove, onDuplicate, onRemove, onShowInstructions,
  onPatchSet, onRemoveSet, onAddSet,
}: SelectedExerciseCardProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { exercise, sets } = selected;
  const logType = getLogType(exercise);
  const isReps = logType === 'reps';
  // Distance only matters for moves like a run or a ride; elsewhere it would
  // just add a line to every set. It stays visible wherever one was entered.
  const showDistance = exercise.category === 'cardio' || !!exercise.defaultDistance || sets.some(set => set.distance);
  const imageUrl = getExerciseImageUrl(exercise);
  const setsId = `sets-${selected.occurrenceId}`;
  const fieldId = (field: string, setIndex: number) => `${field}-${index}-${setIndex}`;

  return (
    <div data-reorder-id={selected.occurrenceId}
      className={cn('rounded-md border p-3', dragging && 'border-primary bg-primary/5 shadow-lg')}>
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 items-center">
          <button type="button" aria-label={`Hold and drag ${exercise.name}`}
            className="touch-none rounded p-1 text-muted-foreground md:hidden" {...dragHandleProps}>
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="flex flex-col -my-1">
            <Button variant="ghost" size="icon" type="button" className="h-5 w-6" onClick={() => onMove(-1)}
              disabled={disabled || index === 0} aria-label="Move exercise up">
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className="h-5 w-6" onClick={() => onMove(1)}
              disabled={disabled || index === count - 1} aria-label="Move exercise down">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {imageUrl
            ? <ExerciseImage imageUrl={imageUrl} alt={`${exercise.name} thumbnail`} className="h-full w-full object-contain" />
            : <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="flex items-baseline gap-1.5 text-sm font-medium leading-tight break-words sm:text-base">
            <span className="shrink-0 font-semibold text-primary">{index + 1}.</span>
            <span className="min-w-0">{exercise.name}</span>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{summarizeSets(exercise, sets)}</p>
        </div>

        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
          onClick={() => setExpanded(open => !open)} aria-expanded={expanded} aria-controls={setsId}
          aria-label={`${expanded ? 'Hide' : 'Edit'} sets for ${exercise.name}`}>
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1 pl-1">
        {getExecutionDirections(exercise).length > 0 && <div className="mr-auto"><UnilateralSetNote exercise={exercise} /></div>}
        <div className="ml-auto flex items-center gap-1">
          {onShowInstructions && exercise.instructions && (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground"
              onClick={onShowInstructions} aria-label={`View instructions for ${exercise.name}`}>
              <Info className="h-3.5 w-3.5 sm:mr-1" aria-hidden="true" /><span className="hidden sm:inline">Instructions</span>
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onDuplicate} disabled={disabled} aria-label={`Duplicate ${exercise.name}`}>
            <Copy className="h-3.5 w-3.5 sm:mr-1" aria-hidden="true" /><span className="hidden sm:inline">Duplicate</span>
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={onRemove} disabled={disabled} aria-label={`Remove ${exercise.name}`}>
            <Trash2 className="h-3.5 w-3.5 sm:mr-1" aria-hidden="true" /><span className="hidden sm:inline">Remove</span>
          </Button>
        </div>
      </div>

      {expanded && (
        <div id={setsId} className="mt-2 space-y-2">
          {sets.map((set, setIndex) => (
            <div key={setIndex} className={cn('space-y-1.5 rounded-md p-2',
              set.warmup ? 'border border-amber-400/30 bg-amber-400/10' : 'bg-muted/40')}>
              <div className="flex items-end gap-1.5">
                <span className="w-6 shrink-0 pb-2 text-sm font-semibold" aria-label={`Set ${setIndex + 1}`}>{setIndex + 1}</span>
                {logType === 'holds' ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={fieldId('reps', setIndex)} className="text-[11px] text-muted-foreground">Holds</Label>
                      <Input id={fieldId('reps', setIndex)} type="number" min="1" max="1000" className="h-8 px-2"
                        value={set.reps || ''} disabled={disabled}
                        onChange={event => onPatchSet(setIndex, { reps: numberFrom(event.target.value) })} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={fieldId('duration', setIndex)} className="text-[11px] text-muted-foreground">Sec each</Label>
                      <Input id={fieldId('duration', setIndex)} type="number" min="1" max="86400" className="h-8 px-2"
                        value={set.duration || ''} disabled={disabled}
                        onChange={event => onPatchSet(setIndex, { duration: numberFrom(event.target.value) })} />
                    </div>
                  </>
                ) : isReps ? (
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={fieldId('reps', setIndex)} className="text-[11px] text-muted-foreground">Reps</Label>
                    <Input id={fieldId('reps', setIndex)} type="number" min="1" max="1000" className="h-8 px-2"
                      value={set.reps || ''} disabled={disabled}
                      onChange={event => onPatchSet(setIndex, { reps: numberFrom(event.target.value) })} />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={fieldId('duration', setIndex)} className="text-[11px] text-muted-foreground">Time (s)</Label>
                    <Input id={fieldId('duration', setIndex)} type="number" min="1" max="86400" className="h-8 px-2"
                      value={set.duration || ''} disabled={disabled}
                      onChange={event => onPatchSet(setIndex, { duration: numberFrom(event.target.value) })} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Label htmlFor={fieldId('weight', setIndex)} className="text-[11px] text-muted-foreground">kg</Label>
                  <Input id={fieldId('weight', setIndex)} type="number" min="0" max="1000" step="0.5" className="h-8 px-2"
                    placeholder="–" value={set.weight || ''} disabled={disabled}
                    onChange={event => onPatchSet(setIndex, { weight: numberFrom(event.target.value) })} />
                </div>
                <div className="min-w-0 flex-1">
                  <Label htmlFor={fieldId('rest', setIndex)} className="text-[11px] text-muted-foreground">Rest (s)</Label>
                  <Input id={fieldId('rest', setIndex)} type="number" min="0" max="3600" className="h-8 px-2"
                    value={set.restAfter ?? (setIndex < sets.length - 1 ? restBetweenSets : restBetweenExercises)} disabled={disabled}
                    onChange={event => onPatchSet(setIndex, { restAfter: numberFrom(event.target.value) })} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => onRemoveSet(setIndex)} disabled={disabled}
                  aria-label={`Remove set ${setIndex + 1} from ${exercise.name}`}>
                  <Minus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pl-[1.875rem]">
                <Select value={set.direction ?? 'none'} disabled={disabled}
                  onValueChange={value => onPatchSet(setIndex, { direction: value as WorkoutSet['direction'] })}>
                  <SelectTrigger className="h-7 w-[108px] px-2 text-xs" aria-label={`Direction for set ${setIndex + 1}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKOUT_SET_DIRECTIONS.map(direction => (
                      <SelectItem key={direction} value={direction}>{workoutDirectionLabel(direction)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" className="h-7 px-2 text-xs"
                  variant={set.warmup ? 'default' : 'outline'} aria-pressed={!!set.warmup} disabled={disabled}
                  onClick={() => onPatchSet(setIndex, { warmup: set.warmup ? undefined : true })}>
                  Warm-up
                </Button>
                {isReps && (
                  <Button type="button" size="sm" className="h-7 px-2 text-xs"
                    variant={set.amrap ? 'default' : 'outline'} aria-pressed={!!set.amrap} disabled={disabled}
                    onClick={() => onPatchSet(setIndex, { amrap: set.amrap ? undefined : true })}>
                    AMRAP
                  </Button>
                )}
                {showDistance && <div className="flex items-center gap-1">
                  <Label htmlFor={fieldId('distance', setIndex)} className="text-[11px] text-muted-foreground">Distance (m)</Label>
                  <Input id={fieldId('distance', setIndex)} type="number" min="0" max="1000000" step="100" className="h-7 w-[4.5rem] px-2 text-xs"
                    placeholder="–" value={set.distance || ''} disabled={disabled}
                    onChange={event => onPatchSet(setIndex, { distance: numberFrom(event.target.value) })} />
                </div>}
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="flex w-full items-center justify-center gap-1"
            onClick={onAddSet} disabled={disabled}>
            <Plus className="h-4 w-4" /> Add Set
          </Button>
        </div>
      )}
    </div>
  );
};

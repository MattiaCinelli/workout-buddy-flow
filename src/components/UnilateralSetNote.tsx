import { ArrowLeftRight } from 'lucide-react';
import { getExecutionDirections, EXECUTION_DIRECTION_LABELS, type Exercise } from '@/data/exercises';

// Retains the legacy component name, but now describes all configured
// directional defaults. Every direction is represented by a separate set.
export const UnilateralSetNote = ({ exercise }: { exercise: Exercise }) => {
  const directions = getExecutionDirections(exercise);
  const alternates = directions.includes('alternate');
  return (
    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-workout-green">
      <ArrowLeftRight className="h-3 w-3 shrink-0" aria-hidden="true" />
      {alternates
        ? 'Alternate sides within each set'
        : `Separate sets: ${directions.map(direction => EXECUTION_DIRECTION_LABELS[direction]).join(', ')}`}
    </p>
  );
};

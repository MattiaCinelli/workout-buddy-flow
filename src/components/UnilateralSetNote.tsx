import { ArrowLeftRight } from 'lucide-react';
import { getExecutionDirections, EXECUTION_DIRECTION_LABELS, type Exercise } from '@/data/exercises';

// Retains the legacy component name, but now describes all configured
// directional defaults. Every direction is represented by a separate set.
export const UnilateralSetNote = ({ exercise }: { exercise: Exercise }) => (
  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-workout-green">
    <ArrowLeftRight className="h-3 w-3 shrink-0" aria-hidden="true" />
    Separate sets: {getExecutionDirections(exercise).map(direction => EXECUTION_DIRECTION_LABELS[direction]).join(', ')}
  </p>
);

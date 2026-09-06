import {
  EXECUTION_DIRECTION_LABELS,
  getExecutionDirections,
  type Exercise,
  type ExecutionDirection,
} from '@/data/exercises';
import type { WorkoutSet, WorkoutSetDirection } from '@/data/workoutHistory';

export const WORKOUT_SET_DIRECTIONS: WorkoutSetDirection[] = [
  'none', 'left', 'right', 'forward', 'backward',
];

export const workoutDirectionLabel = (direction?: WorkoutSetDirection): string =>
  !direction || direction === 'none' ? 'No direction' : EXECUTION_DIRECTION_LABELS[direction];

/** Creates one visible workout set per configured direction. */
export const expandSetForExercise = (set: WorkoutSet, exercise: Exercise): WorkoutSet[] => {
  const directions = getExecutionDirections(exercise);
  return directions.length
    ? directions.map(direction => ({ ...set, direction }))
    : [{ ...set, direction: 'none' }];
};

/** Upgrades old unilateral workout rows only in the editor, when saved. */
export const materializeLegacyDirections = (sets: WorkoutSet[], exercise: Exercise): WorkoutSet[] =>
  sets.flatMap(set => set.direction === undefined
    ? expandSetForExercise(set, exercise)
    : [{ ...set }]);

export const isDirectional = (
  direction?: WorkoutSetDirection,
): direction is ExecutionDirection => !!direction && direction !== 'none';

import {
  EXECUTION_DIRECTIONS,
  EXECUTION_DIRECTION_LABELS,
  getExecutionDirections,
  type Exercise,
  type ExecutionDirection,
} from '@/data/exercises';
import type { WorkoutSet, WorkoutSetDirection } from '@/data/workoutHistory';

export const WORKOUT_SET_DIRECTIONS: WorkoutSetDirection[] = [
  'none', ...EXECUTION_DIRECTIONS,
];

const SIDES = ['left', 'right'] as const;
const ORIENTATIONS = ['forward', 'backward'] as const;

/** Converts an ambiguous side + orientation selection into explicit pairs. */
export const combineExecutionDirections = (directions: ExecutionDirection[]): ExecutionDirection[] => {
  if (directions.includes('alternate')) return ['alternate'];
  const sides = SIDES.filter(side => directions.some(direction => direction === side || direction.startsWith(`${side}-`)));
  const orientations = ORIENTATIONS.filter(orientation => directions.some(direction => direction === orientation || direction.endsWith(`-${orientation}`)));
  if (!sides.length || !orientations.length) return directions;
  return orientations.flatMap(orientation => sides.map(side => `${side}-${orientation}` as ExecutionDirection));
};

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

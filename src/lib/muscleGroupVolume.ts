import { Exercise } from '@/data/exercises';
import { WorkoutSession, WorkoutSetResult } from '@/data/workoutSessions';
import { MUSCLE_REGIONS, type MuscleGroup, type MuscleRegionId } from '@/data/muscleGroups';
import { regionsOfExercise } from '@/lib/muscleRegions';

export interface MuscleGroupLoad {
  muscleGroupId: string;
  /** Completed working sets that hit this muscle group. */
  sets: number;
  /** Σ weight×reps across those sets that carried both (0 for bodyweight / timed work). */
  volume: number;
}

const completedSetsOf = (session: WorkoutSession): WorkoutSetResult[] =>
  (session.actualSets ?? session.sets.map((set, setIndex) => ({ ...set, setIndex, completed: true })))
    .filter(set => set.completed && !set.warmup);

// Attributes each completed set to every muscle group its exercise is
// tagged with — "sets per muscle group" being the usual way training
// volume is compared. `sinceIso`, when given, limits it to a recent window.
export const muscleGroupLoad = (
  sessions: WorkoutSession[],
  exercises: Exercise[],
  sinceIso?: string,
): MuscleGroupLoad[] => {
  const since = sinceIso ? new Date(sinceIso).getTime() : Number.NEGATIVE_INFINITY;
  const byGroup = new Map<string, MuscleGroupLoad>();

  for (const session of sessions) {
    if (new Date(session.date).getTime() < since) continue;
    for (const set of completedSetsOf(session)) {
      const exercise = exercises.find(item => item.id === set.exerciseId);
      if (!exercise || exercise.muscleGroups.length === 0) continue;
      const volume = set.weight !== undefined && set.reps !== undefined ? set.weight * set.reps : 0;
      for (const groupId of exercise.muscleGroups) {
        const entry = byGroup.get(groupId) ?? { muscleGroupId: groupId, sets: 0, volume: 0 };
        entry.sets += 1;
        entry.volume += volume;
        byGroup.set(groupId, entry);
      }
    }
  }

  return [...byGroup.values()].sort((a, b) => b.sets - a.sets || b.volume - a.volume);
};

export interface MuscleRegionLoad {
  region: MuscleRegionId;
  sets: number;
  volume: number;
}

// Same as muscleGroupLoad, one level up. A set counts once per region it
// works, however many of that region's muscles the exercise is tagged with:
// a squat tagged Quadriceps and Hamstrings is one Legs & Feet set, not two.
export const regionLoad = (
  sessions: WorkoutSession[],
  exercises: Exercise[],
  muscleGroups: MuscleGroup[],
  sinceIso?: string,
): MuscleRegionLoad[] => {
  const since = sinceIso ? new Date(sinceIso).getTime() : Number.NEGATIVE_INFINITY;
  const byRegion = new Map<MuscleRegionId, MuscleRegionLoad>();

  for (const session of sessions) {
    if (new Date(session.date).getTime() < since) continue;
    for (const set of completedSetsOf(session)) {
      const exercise = exercises.find(item => item.id === set.exerciseId);
      if (!exercise) continue;
      const volume = set.weight !== undefined && set.reps !== undefined ? set.weight * set.reps : 0;
      for (const region of regionsOfExercise(exercise, muscleGroups)) {
        const entry = byRegion.get(region) ?? { region, sets: 0, volume: 0 };
        entry.sets += 1;
        entry.volume += volume;
        byRegion.set(region, entry);
      }
    }
  }

  const order = MUSCLE_REGIONS.map(region => region.id);
  return [...byRegion.values()].sort((a, b) => b.sets - a.sets || order.indexOf(a.region) - order.indexOf(b.region));
};

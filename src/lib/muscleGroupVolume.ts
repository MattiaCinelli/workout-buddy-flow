import { Exercise } from '@/data/exercises';
import { WorkoutSession, WorkoutSetResult } from '@/data/workoutSessions';

export interface MuscleGroupLoad {
  muscleGroupId: string;
  /** Completed working sets that hit this muscle group. */
  sets: number;
  /** Σ weight×reps across those sets that carried both (0 for bodyweight / timed work). */
  volume: number;
}

const completedSetsOf = (session: WorkoutSession): WorkoutSetResult[] =>
  session.actualSets?.filter(set => set.completed)
  ?? session.sets.map((set, setIndex) => ({ ...set, setIndex, completed: true }));

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

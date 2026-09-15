import { describe, expect, it } from 'vitest';
import { defaultCourses } from './courses';
import { exerciseList, getLogType } from './exercises';
import { workoutHistory } from './workoutHistory';
import { pendingSeedAdditions, SEED_VERSION } from '@/lib/seedVersion';

describe('Zero to Wet Noodle course', () => {
  const course = defaultCourses.find(item => item.id === 'seed-course-wet-noodle');

  it('contains six Monday-to-Friday weeks backed by valid workouts and exercises', () => {
    expect(course).toBeDefined();
    expect(course?.durationWeeks).toBe(6);
    expect(course?.workouts).toHaveLength(30);

    for (let week = 1; week <= 6; week += 1) {
      const days = course?.workouts.filter(item => item.week === week).map(item => item.day);
      expect(days).toEqual([1, 2, 3, 4, 5]);
    }

    for (const item of course?.workouts ?? []) {
      const workout = workoutHistory.find(candidate => candidate.id === item.workoutId);
      expect(workout, item.workoutId).toBeDefined();
      for (const set of workout?.sets ?? []) {
        expect(exerciseList.some(exercise => exercise.id === set.exerciseId), set.exerciseId).toBe(true);
      }
    }
  });

  it('uses exactly two uniform sets for each exercise and direction', () => {
    const workouts = workoutHistory.filter(item => item.id.startsWith('seed-wet-noodle-'));
    expect(workouts).toHaveLength(30);

    for (const workout of workouts) {
      const groups = new Map<string, typeof workout.sets>();
      for (const set of workout.sets) {
        const key = `${set.exerciseId}:${set.direction ?? 'none'}`;
        groups.set(key, [...(groups.get(key) ?? []), set]);
      }
      for (const sets of groups.values()) {
        expect(sets).toHaveLength(2);
        const exercise = exerciseList.find(item => item.id === sets[0].exerciseId)!;
        if (getLogType(exercise) === 'time') {
          expect(sets.every(set => set.duration === 30 && set.reps === undefined)).toBe(true);
        } else {
          expect(sets.every(set => set.reps === 13 && set.duration === undefined)).toBe(true);
        }
      }
    }
  });

  it('is installed additively for devices that already completed seed version 7', () => {
    const exerciseAdditions = pendingSeedAdditions(
      exerciseList.filter(item => !item.id.startsWith('mobility-half-split')
        && !['mobility-adductor-rock-back', 'mobility-side-leg-raise', 'mobility-childs-pose-side-reach',
          'mobility-reverse-lunge', 'mobility-full-range-calf-raise', 'mobility-overhead-reach'].includes(item.id)),
      exerciseList,
      7,
      SEED_VERSION,
    );
    const workoutAdditions = pendingSeedAdditions(
      workoutHistory.filter(item => !item.id.startsWith('seed-wet-noodle-')),
      workoutHistory,
      7,
      SEED_VERSION,
    );
    const courseAdditions = pendingSeedAdditions(
      defaultCourses.filter(item => item.id !== 'seed-course-wet-noodle'),
      defaultCourses,
      7,
      SEED_VERSION,
    );

    expect(exerciseAdditions).toHaveLength(7);
    expect(workoutAdditions).toHaveLength(30);
    expect(courseAdditions.map(item => item.id)).toEqual(['seed-course-wet-noodle']);
  });
});

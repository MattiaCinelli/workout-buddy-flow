import { describe, expect, it } from 'vitest';
import { defaultMuscleGroups, type MuscleGroup } from '@/data/muscleGroups';
import type { Exercise } from '@/data/exercises';
import type { WorkoutSession } from '@/data/workoutSessions';
import {
  describeMuscleTags, effectiveMuscleFilter, exerciseMatchesMuscleFilter, inferMuscleRegion, mergeMuscleTags,
  muscleTagName, pruneRedundantRegionTags, regionsOfTags,
} from './muscleRegions';
import { regionLoad } from './muscleGroupVolume';

const groups: MuscleGroup[] = [
  ...defaultMuscleGroups,
  { id: 'u-wrist', name: 'Wrist', region: 'arms-hands' },
  { id: 'u-leg', name: 'Leg' },
];

describe('muscle regions', () => {
  it('names region tags, muscle groups and unknown ids', () => {
    expect(muscleTagName('region:legs-feet', groups)).toBe('Legs & Feet');
    expect(muscleTagName('Quadriceps', groups)).toBe('Quadriceps');
    expect(muscleTagName('gone', groups)).toBe('gone');
  });

  it('derives regions from muscles and region tags, and Full Body covers all five', () => {
    expect([...regionsOfTags(['Quadriceps', 'Hamstrings', 'region:neck-back'], groups)].sort())
      .toEqual(['legs-feet', 'neck-back']);
    expect(regionsOfTags(['Full Body'], groups).size).toBe(5);
    expect(regionsOfTags(['u-leg'], groups).size).toBe(0);
  });

  it('describes tags region first, then muscles', () => {
    expect(describeMuscleTags(['Quadriceps', 'Hamstrings'], groups)).toBe('Legs & Feet · Quadriceps, Hamstrings');
    expect(describeMuscleTags(['region:core-hips'], groups)).toBe('Core & Hips');
    expect(describeMuscleTags(['Full Body'], groups)).toBe('Full Body');
  });

  it('drops a region tag once one of its muscles is tagged', () => {
    expect(pruneRedundantRegionTags(['region:legs-feet', 'Calves', 'region:neck-back'], groups))
      .toEqual(['Calves', 'region:neck-back']);
  });

  it('filters by region or muscle, and a muscle picked inside a selected region narrows it', () => {
    const squat = { muscleGroups: ['Quadriceps'] };
    const calfRaise = { muscleGroups: ['Calves'] };
    expect(exerciseMatchesMuscleFilter(squat, ['region:legs-feet'], groups)).toBe(true);
    expect(exerciseMatchesMuscleFilter(squat, ['region:arms-hands'], groups)).toBe(false);
    const narrowed = effectiveMuscleFilter(['region:legs-feet', 'Calves'], groups);
    expect(narrowed).toEqual(['Calves']);
    expect(exerciseMatchesMuscleFilter(squat, narrowed, groups)).toBe(false);
    expect(exerciseMatchesMuscleFilter(calfRaise, narrowed, groups)).toBe(true);
  });

  it('merges a group into a region or a muscle without duplicates', () => {
    expect(mergeMuscleTags(['u-leg', 'Core'], 'u-leg', 'region:legs-feet', groups)).toEqual(['region:legs-feet', 'Core']);
    // Merging into a region the exercise already has a muscle in adds nothing redundant.
    expect(mergeMuscleTags(['u-leg', 'Calves'], 'u-leg', 'region:legs-feet', groups)).toEqual(['Calves']);
    expect(mergeMuscleTags(['Groin', 'Inner Thighs'], 'Groin', 'Inner Thighs', groups)).toEqual(['Inner Thighs']);
    expect(mergeMuscleTags(['Core'], 'u-leg', 'Calves', groups)).toEqual(['Core']);
  });

  it('infers regions for built-ins by id and for the user\'s own groups by name only when clear', () => {
    expect(inferMuscleRegion({ id: 'Back', name: 'Back' }, defaultMuscleGroups)).toBe('neck-back');
    expect(inferMuscleRegion({ id: 'x1', name: 'Piriformis' }, defaultMuscleGroups)).toBe('core-hips');
    expect(inferMuscleRegion({ id: 'x2', name: ' foot ' }, defaultMuscleGroups)).toBe('legs-feet');
    expect(inferMuscleRegion({ id: 'x3', name: 'Leg' }, defaultMuscleGroups)).toBeUndefined();
  });

  it('counts a set once per region however many of its muscles are tagged', () => {
    const exercises = [{ id: 'squat', name: 'Squat', category: 'strength', difficulty: 'beginner', muscleGroups: ['Quadriceps', 'Hamstrings', 'Glutes'] }] as Exercise[];
    const session = {
      id: 's', workoutId: 'w', title: 'Legs', date: '2026-09-01', completedAt: '2026-09-01', duration: 30, plannedDuration: 30,
      category: 'strength', sets: [], actualSets: [
        { exerciseId: 'squat', setIndex: 0, completed: true, reps: 10, weight: 50 },
        { exerciseId: 'squat', setIndex: 1, completed: true, reps: 10, weight: 50, warmup: true },
      ],
    } as unknown as WorkoutSession;
    expect(regionLoad([session], exercises, groups)).toEqual([
      { region: 'core-hips', sets: 1, volume: 500 },
      { region: 'legs-feet', sets: 1, volume: 500 },
    ]);
  });
});

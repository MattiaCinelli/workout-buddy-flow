import { describe, expect, it } from 'vitest';
import { exerciseList } from './exercises';

const mobilityIds = [
  '28',
  '31',
  '34',
  '36',
  '37',
  '32',
  'mobility-open-book-rotations',
  'mobility-deep-squat-hold',
  '30',
  '10',
  'mobility-frog-stretch',
  'mobility-butterfly-stretch',
  '29',
  'mobility-puppy-pose',
  'mobility-supported-straddle',
  'mobility-cossack-squat',
  'mobility-straight-leg-raises',
  'mobility-90-90-hip-switches',
  'mobility-pigeon-pose',
  'mobility-single-leg-deadlift-stretch',
  'mobility-reclined-hamstring-strap',
  'mobility-side-lunge-hold',
  'mobility-doorframe-lat-stretch',
  'mobility-sleeper-stretch',
  'mobility-knee-to-wall',
  'mobility-bent-knee-soleus-stretch',
  'mobility-downward-dog-heel-pumps',
  'mobility-thread-the-needle',
  'mobility-foam-roller-thoracic-extension',
];

describe('starter mobility exercises', () => {
  it('contains every researched exercise with unique stable ids and photographs', () => {
    expect(new Set(exerciseList.map(exercise => exercise.id)).size).toBe(exerciseList.length);

    for (const id of mobilityIds) {
      const exercise = exerciseList.find(item => item.id === id);
      expect(exercise, id).toBeDefined();
      expect(exercise?.defaultSets).toBe(2);
      expect(exercise?.instructions.length).toBeGreaterThan(40);
      expect(exercise?.videoUrl).toMatch(/^https:\/\//);
      expect(exercise?.imageUrl).toMatch(/^private-exercise:mobility-.*\.jpg$/);

      if (exercise?.logType === 'time') expect(exercise.defaultDuration).toBe(30);
      else expect(exercise?.defaultReps).toBe(13);
    }
  });
});

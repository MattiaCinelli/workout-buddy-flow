import { describe, expect, it } from 'vitest';
import { exerciseList, getExerciseImageUrl } from './exercises';

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
  'mobility-standing-pancake-stretch',
  'mobility-hurdler-stretch',
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

  it('marks Cossack squats as alternating within each set', () => {
    expect(exerciseList.find(item => item.id === 'mobility-cossack-squat')?.executionDirections)
      .toEqual(['alternate']);
  });
});

describe('additional private-image mobility exercises', () => {
  const ids = [
    'mobility-elephant-walks',
    'mobility-lying-cross',
    'mobility-spine-backbend',
    'mobility-shoulder-backbend',
    'mobility-rear-hand-clasp',
    'mobility-wall-angels',
    'mobility-towel-shoulder-pass-through',
  ];

  it('includes every image-backed movement with the standard prescription', () => {
    for (const id of ids) {
      const exercise = exerciseList.find(item => item.id === id);
      expect(exercise, id).toBeDefined();
      expect(exercise?.defaultSets).toBe(2);
      expect(exercise?.instructions?.length).toBeGreaterThan(100);
      expect(exercise?.imageUrl).toMatch(/^private-exercise:/);
      if (exercise?.logType === 'time') expect(exercise.defaultDuration).toBe(30);
      else expect(exercise?.defaultReps).toBe(13);
    }
  });
});

describe('starter exercise image privacy', () => {
  it('never exposes a built-in exercise image through a public URL', () => {
    for (const exercise of exerciseList) {
      if (exercise.imageUrl) expect(exercise.imageUrl).toMatch(/^private-exercise:/);
      for (const imageUrl of Object.values(exercise.directionImageUrls ?? {})) {
        expect(imageUrl).toMatch(/^private-exercise:/);
      }
    }
  });
});

describe('getExerciseImageUrl', () => {
  const exercise = {
    imageUrl: '/default.jpg',
    directionImageUrls: { left: '/left.jpg', right: '/right.jpg' },
  } as const;

  it('uses a direction-specific image when one exists', () => {
    expect(getExerciseImageUrl(exercise, 'left')).toBe('/left.jpg');
  });

  it('falls back to the default image for missing or unspecified directions', () => {
    expect(getExerciseImageUrl(exercise, 'forward')).toBe('/default.jpg');
    expect(getExerciseImageUrl(exercise)).toBe('/default.jpg');
  });
});

describe('course mobility exercises', () => {
  const ids = [
    'mobility-half-split-stretch',
    'mobility-adductor-rock-back',
    'mobility-side-leg-raise',
    'mobility-childs-pose-side-reach',
    'mobility-reverse-lunge',
    'mobility-full-range-calf-raise',
    'mobility-overhead-reach',
  ];

  it('includes every course movement with complete beginner guidance', () => {
    for (const id of ids) {
      const exercise = exerciseList.find(item => item.id === id);
      expect(exercise, id).toBeDefined();
      expect(exercise?.difficulty).toBe('beginner');
      expect(exercise?.muscleGroups.length).toBeGreaterThan(0);
      expect(exercise?.instructions?.length).toBeGreaterThan(100);
      expect(exercise?.defaultSets).toBe(2);
    }
  });
});

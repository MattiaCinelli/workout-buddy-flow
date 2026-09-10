import { describe, expect, it } from 'vitest';
import { privateExerciseImageFilename } from '@/lib/exerciseMediaClient';

describe('privateExerciseImageFilename', () => {
  it('recognizes the private media marker', () => {
    expect(privateExerciseImageFilename('private-exercise:mobility-cat-cow.jpg'))
      .toBe('mobility-cat-cow.jpg');
  });

  it('routes legacy public mobility photographs through private media', () => {
    expect(privateExerciseImageFilename('/exercises/mobility-cat-cow.jpg'))
      .toBe('mobility-cat-cow.jpg');
  });

  it('does not intercept unrelated or unsafe image paths', () => {
    expect(privateExerciseImageFilename('/placeholder.svg')).toBeNull();
    expect(privateExerciseImageFilename('/exercises/../mobility-secret.jpg')).toBeNull();
  });
});

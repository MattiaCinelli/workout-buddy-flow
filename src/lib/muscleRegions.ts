import type { Exercise } from '@/data/exercises';
import { MUSCLE_REGIONS, type MuscleGroup, type MuscleRegionId } from '@/data/muscleGroups';

// Two-level muscle tagging. An exercise's `muscleGroups` holds muscle-group
// ids and, when the exact muscle doesn't matter, whole-region tags
// (`region:legs-feet`). Regions are never stored twice: tagging Quadriceps
// already counts as Legs & Feet, derived here from the group's `region`.

const REGION_PREFIX = 'region:';
export const FULL_BODY_ID = 'Full Body';
const REGION_IDS = new Set<string>(MUSCLE_REGIONS.map(region => region.id));

export const regionTag = (region: MuscleRegionId): string => `${REGION_PREFIX}${region}`;

/** The region a `region:` tag names, or undefined for a muscle-group id. */
export const regionOfTag = (tag: string): MuscleRegionId | undefined => {
  if (!tag.startsWith(REGION_PREFIX)) return undefined;
  const id = tag.slice(REGION_PREFIX.length);
  return REGION_IDS.has(id) ? id as MuscleRegionId : undefined;
};

export const regionName = (region: MuscleRegionId): string =>
  MUSCLE_REGIONS.find(item => item.id === region)?.name ?? region;

/** Display name for any tag: a region, a muscle group, or the raw id as a last resort. */
export const muscleTagName = (tag: string, groups: MuscleGroup[]): string => {
  const region = regionOfTag(tag);
  if (region) return regionName(region);
  return groups.find(group => group.id === tag)?.name ?? tag;
};

/** Every region an exercise works: tagged directly, via its muscles, or all of them for Full Body. */
export const regionsOfTags = (tags: string[], groups: MuscleGroup[]): Set<MuscleRegionId> => {
  const regions = new Set<MuscleRegionId>();
  for (const tag of tags) {
    if (tag === FULL_BODY_ID) return new Set(MUSCLE_REGIONS.map(region => region.id));
    const direct = regionOfTag(tag);
    const region = direct ?? groups.find(group => group.id === tag)?.region;
    if (region) regions.add(region);
  }
  return regions;
};

export const regionsOfExercise = (exercise: Pick<Exercise, 'muscleGroups'>, groups: MuscleGroup[]) =>
  regionsOfTags(exercise.muscleGroups, groups);

/**
 * Library filter: a selected region matches any exercise in that region;
 * a selected muscle matches exercises tagged with it. Any selection matching
 * is enough, the same "any of" rule the filter always used.
 */
export const exerciseMatchesMuscleFilter = (
  exercise: Pick<Exercise, 'muscleGroups'>,
  selected: string[],
  groups: MuscleGroup[],
): boolean => {
  if (selected.length === 0) return true;
  const regions = regionsOfExercise(exercise, groups);
  return selected.some(tag => {
    const region = regionOfTag(tag);
    return region ? regions.has(region) : exercise.muscleGroups.includes(tag);
  });
};

/** Badge text: regions first, then the specific muscles, e.g. "Legs & Feet · Quadriceps, Hamstrings". */
export const describeMuscleTags = (tags: string[], groups: MuscleGroup[]): string => {
  const regions = [...regionsOfTags(tags, groups)];
  const allRegions = regions.length === MUSCLE_REGIONS.length && tags.includes(FULL_BODY_ID);
  const regionPart = allRegions ? 'Full Body' : MUSCLE_REGIONS
    .filter(region => regions.includes(region.id))
    .map(region => region.name)
    .join(', ');
  const muscles = tags
    .filter(tag => !regionOfTag(tag) && tag !== FULL_BODY_ID)
    .map(tag => muscleTagName(tag, groups));
  return [regionPart, muscles.join(', ')].filter(Boolean).join(' · ');
};

/**
 * Keeps the tag list free of redundant region tags: a region tag is dropped
 * once one of that region's muscles is also tagged.
 */
export const pruneRedundantRegionTags = (tags: string[], groups: MuscleGroup[]): string[] => {
  const coveredByMuscle = new Set(tags
    .filter(tag => !regionOfTag(tag))
    .map(tag => groups.find(group => group.id === tag)?.region)
    .filter((region): region is MuscleRegionId => !!region));
  return tags.filter(tag => {
    const region = regionOfTag(tag);
    return !region || !coveredByMuscle.has(region);
  });
};

// Regions for groups made before regions existed, matched by name. Only
// fills a missing region; a region the user chose is never overwritten.
const REGION_BY_NAME: Record<string, MuscleRegionId> = {
  neck: 'neck-back', back: 'neck-back', 'upper back': 'neck-back', 'lower back': 'neck-back', spine: 'neck-back', traps: 'neck-back', lats: 'neck-back',
  chest: 'chest-shoulders', shoulder: 'chest-shoulders', shoulders: 'chest-shoulders', pecs: 'chest-shoulders',
  biceps: 'arms-hands', triceps: 'arms-hands', forearm: 'arms-hands', forearms: 'arms-hands', wrist: 'arms-hands', wrists: 'arms-hands', hand: 'arms-hands', hands: 'arms-hands', fingers: 'arms-hands',
  core: 'core-hips', abs: 'core-hips', obliques: 'core-hips', hips: 'core-hips', hip: 'core-hips', 'hip flexors': 'core-hips', glutes: 'core-hips', piriformis: 'core-hips', groin: 'core-hips', 'inner thighs': 'core-hips', adductors: 'core-hips',
  quadriceps: 'legs-feet', quads: 'legs-feet', hamstrings: 'legs-feet', calves: 'legs-feet', calf: 'legs-feet', ankles: 'legs-feet', ankle: 'legs-feet', foot: 'legs-feet', feet: 'legs-feet', shins: 'legs-feet',
};

export const inferMuscleRegion = (group: Pick<MuscleGroup, 'id' | 'name'>, defaults: MuscleGroup[]): MuscleRegionId | undefined =>
  defaults.find(item => item.id === group.id)?.region ?? REGION_BY_NAME[group.name.trim().toLocaleLowerCase()];

/**
 * The library's muscle filter as it applies: a selected region narrows to
 * the muscles picked inside it, if any; with none picked it matches the
 * whole region.
 */
export const effectiveMuscleFilter = (selected: string[], groups: MuscleGroup[]): string[] => {
  const narrowed = new Set(selected
    .filter(tag => !regionOfTag(tag))
    .map(tag => groups.find(group => group.id === tag)?.region)
    .filter((region): region is MuscleRegionId => !!region));
  return selected.filter(tag => {
    const region = regionOfTag(tag);
    return !region || !narrowed.has(region);
  });
};

/** An exercise's tags after merging one muscle group into another muscle or a region. */
export const mergeMuscleTags = (tags: string[], fromId: string, toTag: string, groups: MuscleGroup[]): string[] => {
  if (!tags.includes(fromId)) return tags;
  const replaced = [...new Set(tags.map(tag => tag === fromId ? toTag : tag))];
  return pruneRedundantRegionTags(replaced, groups);
};

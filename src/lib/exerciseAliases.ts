import type { Exercise } from '@/data/exercises';

const normalizeName = (value: string): string => value.trim().toLocaleLowerCase();

export const normalizeExerciseAliases = (
  aliases: readonly string[] | string | undefined,
  canonicalName?: string,
): string[] => {
  const values = typeof aliases === 'string' ? aliases.split(/[\n,]/) : aliases ?? [];
  const canonical = canonicalName ? normalizeName(canonicalName) : '';
  const seen = new Set<string>();

  return values.flatMap(value => {
    const trimmed = value.trim();
    const normalized = normalizeName(trimmed);
    if (!normalized || normalized === canonical || seen.has(normalized)) return [];
    seen.add(normalized);
    return [trimmed];
  });
};

export const exerciseMatchesNameQuery = (
  exercise: Pick<Exercise, 'name' | 'aliases'>,
  query: string,
): boolean => {
  const normalizedQuery = normalizeName(query);
  if (!normalizedQuery) return true;
  return [exercise.name, ...(exercise.aliases ?? [])]
    .some(name => normalizeName(name).includes(normalizedQuery));
};

// Aliases are search hints, not reserved exercise names. Two exercises may
// share an alias, and an alias may match another exercise's canonical name;
// only duplicate canonical names prevent creation or editing.
export const exerciseNamesConflict = (
  first: Pick<Exercise, 'name'>,
  second: Pick<Exercise, 'name'>,
): boolean => normalizeName(first.name) === normalizeName(second.name);

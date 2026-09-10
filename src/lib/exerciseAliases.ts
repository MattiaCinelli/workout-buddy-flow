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

export const exerciseNamesOverlap = (
  first: Pick<Exercise, 'name' | 'aliases'>,
  second: Pick<Exercise, 'name' | 'aliases'>,
): boolean => {
  const firstNames = new Set(
    [first.name, ...(first.aliases ?? [])].map(normalizeName).filter(Boolean),
  );
  return [second.name, ...(second.aliases ?? [])]
    .map(normalizeName)
    .filter(Boolean)
    .some(name => firstNames.has(name));
};

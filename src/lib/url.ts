// Normalizes a user-typed link to a usable https:// URL.
//
// - A bare host ("youtube.com/watch?v=x") is assumed to be https://.
// - An explicit scheme is kept only if it is https: — http:, data:,
//   javascript:, etc. are rejected, matching the restriction imported
//   backup / share files are held to (see src/lib/backup.ts).
// - Anything that does not parse as a URL returns undefined.
//
// Returns the normalized https URL, or undefined when the input is empty
// or unusable.
export const normalizeHttpsUrl = (raw?: string | null): string | undefined => {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).protocol === 'https:' ? withScheme : undefined;
  } catch {
    return undefined;
  }
};

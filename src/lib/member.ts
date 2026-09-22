/** Helpers for the name split. */

/**
 * The single display name shown in lists, avatars and the work log.
 * Stored on the member rather than derived at every call site, so the ~20
 * places that already read `member.name` keep working untouched.
 */
export function composeName(firstName: string, lastName: string, fallback = ''): string {
  const joined = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
  return joined || fallback;
}

/** Split a legacy one-field name, for rows written before first/last existed. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

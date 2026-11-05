/**
 * Client-side convention: a space whose name starts with "Archive:" is treated
 * as archived. Archived spaces stay fully browsable but are listed separately.
 */
const ARCHIVE_PREFIX = /^\s*archive\s*:/i;

export function isArchivedSpace(space?: { name?: string | null }): boolean {
  return !!space?.name && ARCHIVE_PREFIX.test(space.name);
}

export function partitionArchivedSpaces<T extends { name?: string | null }>(
  spaces: T[] = [],
): { active: T[]; archived: T[] } {
  const active: T[] = [];
  const archived: T[] = [];
  for (const space of spaces) {
    (isArchivedSpace(space) ? archived : active).push(space);
  }
  return { active, archived };
}

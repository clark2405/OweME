/**
 * Pure last-write-wins merge used by the sign-in sync (store.ts). Kept dependency-
 * free (no native imports) so it's unit-testable on its own — this is where a
 * sync bug would silently lose data, so it's worth covering.
 */

/** Union two lists by id; per id keep whichever was edited most recently
 *  (last-write-wins via `updatedAt`). Returns the merged set + the records
 *  sourced from LOCAL — the ones the cloud is missing or that local edited later,
 *  i.e. the set to push up. Missing `updatedAt` sorts oldest, and ties favour
 *  local (so a local edit is never dropped in favour of an identical cloud row). */
export function mergeById<T extends { id: string; updatedAt?: string }>(
  local: T[],
  cloud: T[],
): { merged: T[]; fromLocal: T[] } {
  const cloudMap = new Map(cloud.map((c) => [c.id, c]));
  const chosen = new Map<string, T>(cloudMap);
  const fromLocal: T[] = [];
  for (const l of local) {
    const c = cloudMap.get(l.id);
    if (!c || (l.updatedAt ?? '') >= (c.updatedAt ?? '')) {
      chosen.set(l.id, l);
      fromLocal.push(l);
    }
  }
  return { merged: [...chosen.values()], fromLocal };
}

/** Deterministic + random id helpers. */

let counter = 0;

export function uid(prefix: string): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${rand}`;
}

/** Stable id derived from content — used so re-generating the same plan yields the same task ids. */
export function stableId(prefix: string, ...parts: Array<string | number | null | undefined>): string {
  const input = parts.map((p) => (p === null || p === undefined ? '_' : String(p))).join('|');
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

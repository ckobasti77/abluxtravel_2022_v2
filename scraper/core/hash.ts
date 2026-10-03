// Pure, runtime-agnostic content hash (change detection only, not security).
// Two FNV-1a 32-bit lanes with different offsets → 16 hex chars.

export function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) return "null";
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function fnv1a(text: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function hash64(text: string): string {
  const a = fnv1a(text, 0x811c9dc5);
  const b = fnv1a(text, 0x9747b28c ^ text.length);
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

export function hashValue(value: unknown): string {
  return hash64(stableStringify(value));
}

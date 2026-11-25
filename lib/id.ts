export function stableId(prefix: string, ...parts: string[]): string {
  const source = parts.join("|").toLowerCase().replace(/\s+/g, " ").trim();
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function randomId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}${Date.now().toString(36)}`;
}

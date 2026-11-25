import { collapseSpace } from "@/lib/text";

const GENERIC = new Set(["speaker", "unknown", "participant", "guest"]);

export function looksLikeName(value: string): boolean {
  const cleaned = collapseSpace(value).replace(/:$/, "");
  if (!cleaned || cleaned.length > 60 || cleaned.includes(":")) return false;
  if (/-->|\d{1,2}:\d{2}/.test(cleaned)) return false;
  const words = cleaned.split(" ");
  if (words.length === 0 || words.length > 5) return false;
  if (!/\p{L}/u.test(cleaned)) return false;
  const first = words[0] ?? "";
  const allCaps = cleaned === cleaned.toUpperCase();
  const titled = /^\p{Lu}/u.test(first);
  if (!allCaps && !titled) return false;
  if (GENERIC.has(cleaned.toLowerCase())) return false;
  return true;
}

export function cleanSpeaker(value: string): string {
  const cleaned = collapseSpace(value).replace(/:$/, "");
  if (!looksLikeName(cleaned)) return "Speaker";
  return cleaned;
}

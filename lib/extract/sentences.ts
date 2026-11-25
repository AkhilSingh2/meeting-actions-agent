import { collapseSpace, normalizeApostrophes } from "@/lib/text";

export function splitSentences(text: string): string[] {
  const normalized = collapseSpace(normalizeApostrophes(text)).replace(
    /\b(Mr|Mrs|Ms|Dr|e\.g|i\.e)\./gi,
    (match) => match.replaceAll(".", "∯"),
  );
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((part) => part.replaceAll("∯", ".").trim())
    .filter(Boolean);
}

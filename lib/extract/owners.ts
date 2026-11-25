const NOT_NAMES = new Set([
  "this",
  "that",
  "we",
  "it",
  "there",
  "today",
  "tomorrow",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "please",
  "action",
  "the",
  "team",
  "everyone",
  "someone",
  "somebody",
  "anybody",
  "people",
  "let",
  "lets",
  "our",
  "their",
  "next",
  "end",
  "just",
  "also",
  "they",
  "he",
  "she",
  "i",
]);

export function isPersonName(value: string): boolean {
  const first = value.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  return Boolean(first) && !NOT_NAMES.has(first);
}

export function resolveOwner(raw: string | null, speakers: string[]): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/,$/, "");
  const exact = speakers.find((speaker) => speaker.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;
  const firsts = speakers.filter(
    (speaker) => speaker.split(/\s+/)[0]?.toLowerCase() === cleaned.toLowerCase(),
  );
  if (firsts.length === 1 && firsts[0]) return firsts[0];
  return cleaned;
}

export function speakerKnown(name: string, speakers: string[]): boolean {
  return resolveOwner(name, speakers) !== name.trim() || speakers.some((speaker) => speaker.toLowerCase() === name.trim().toLowerCase());
}

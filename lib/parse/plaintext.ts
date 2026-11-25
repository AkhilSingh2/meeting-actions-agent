import { toTranscript, type CueDraft } from "@/lib/parse/cues";
import { looksLikeName } from "@/lib/parse/speakers";
import { parseTimestamp } from "@/lib/parse/timestamp";
import { collapseSpace } from "@/lib/text";
import type { ParsedTranscript, TranscriptFormat } from "@/lib/types";

const TIME = "(\\d{1,2}:\\d{2}(?::\\d{2})?(?:[.,]\\d{1,3})?)";

export function parsePlaintext(source: string): ParsedTranscript {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  const candidates: Array<{ format: TranscriptFormat; drafts: CueDraft[] }> = [];
  const zoom = parseZoom(text);
  const meet = parseMeet(text);
  const dialogue = parseDialogue(text);
  if (zoom) candidates.push({ format: "zoom-txt", drafts: zoom });
  if (meet) candidates.push({ format: "meet-txt", drafts: meet });
  if (dialogue) candidates.push({ format: "dialogue", drafts: dialogue });

  if (candidates.length === 0) {
    return toTranscript(
      [{ speaker: "Speaker", startMs: null, endMs: null, text }],
      "plaintext",
    );
  }

  candidates.sort((a, b) => score(b.drafts) - score(a.drafts));
  const best = candidates[0];
  if (!best) {
    return toTranscript([{ speaker: "Speaker", startMs: null, endMs: null, text }], "plaintext");
  }
  return toTranscript(best.drafts, best.format);
}

function score(drafts: CueDraft[]): number {
  const speakers = new Set(drafts.map((draft) => draft.speaker.toLowerCase()));
  const timed = drafts.filter((draft) => draft.startMs != null).length;
  return drafts.length * 3 + speakers.size * 4 + timed;
}

function parseZoom(text: string): CueDraft[] | null {
  const header = new RegExp(`^${TIME}\\s+(.{2,60})$`);
  const drafts: CueDraft[] = [];
  let current: CueDraft | null = null;
  let headers = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const match = line.match(header);
    const name = match?.[2]?.trim() ?? "";
    if (match?.[1] && name && looksLikeName(name) && !/[.!?]$/.test(name)) {
      headers += 1;
      if (current?.text) drafts.push(current);
      current = { speaker: collapseSpace(name), startMs: parseTimestamp(match[1]), endMs: null, text: "" };
      continue;
    }
    if (!line || !current) continue;
    current.text = `${current.text} ${line}`.trim();
  }
  if (current?.text) drafts.push(current);
  return headers >= 2 && drafts.length >= 2 ? drafts : null;
}

function parseMeet(text: string): CueDraft[] | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const drafts: CueDraft[] = [];
  let index = 0;
  while (index < lines.length) {
    const name = lines[index] ?? "";
    const stamp = lines[index + 1] ?? "";
    if (looksLikeName(name) && parseTimestamp(stamp) != null && !stamp.includes(" ")) {
      index += 2;
      const spoken: string[] = [];
      while (index < lines.length) {
        const nextName = lines[index] ?? "";
        const nextStamp = lines[index + 1] ?? "";
        if (looksLikeName(nextName) && parseTimestamp(nextStamp) != null && !nextStamp.includes(" ")) break;
        spoken.push(nextName);
        index += 1;
      }
      const body = spoken.join(" ").trim();
      if (body) drafts.push({ speaker: name, startMs: parseTimestamp(stamp), endMs: null, text: body });
      continue;
    }
    index += 1;
  }
  return drafts.length >= 2 ? drafts : null;
}

function parseDialogue(text: string): CueDraft[] | null {
  const drafts: CueDraft[] = [];
  let current: CueDraft | null = null;
  let matched = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const found = matchDialogueLine(line);
    if (found) {
      matched += 1;
      if (current?.text) drafts.push(current);
      current = found;
      continue;
    }
    if (current) current.text = `${current.text} ${line}`.trim();
  }
  if (current?.text) drafts.push(current);
  return matched >= 2 && drafts.length >= 1 ? drafts : null;
}

function matchDialogueLine(line: string): CueDraft | null {
  const timed = line.match(
    new RegExp(`^\\[?${TIME}\\]?\\s+([^:]{2,60}):\\s+(.+)$`),
  );
  if (timed?.[1] && timed[2] && timed[3] && looksLikeName(timed[2])) {
    return {
      speaker: collapseSpace(timed[2]),
      startMs: parseTimestamp(timed[1]),
      endMs: null,
      text: timed[3].trim(),
    };
  }
  const paren = line.match(
    new RegExp(`^([^:(]{2,60})\\s+\\(${TIME}\\):\\s+(.+)$`),
  );
  if (paren?.[1] && paren[2] && paren[3] && looksLikeName(paren[1])) {
    return {
      speaker: collapseSpace(paren[1]),
      startMs: parseTimestamp(paren[2]),
      endMs: null,
      text: paren[3].trim(),
    };
  }
  const plain = line.match(/^([^:]{2,60}):\s+(.+)$/);
  if (plain?.[1] && plain[2] && looksLikeName(plain[1])) {
    return { speaker: collapseSpace(plain[1]), startMs: null, endMs: null, text: plain[2].trim() };
  }
  return null;
}

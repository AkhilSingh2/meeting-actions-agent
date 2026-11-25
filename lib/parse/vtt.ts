import { toTranscript, type CueDraft } from "@/lib/parse/cues";
import { cleanSpeaker } from "@/lib/parse/speakers";
import { parseTimestamp } from "@/lib/parse/timestamp";
import type { ParsedTranscript } from "@/lib/types";

const TIMING =
  /(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s+-->\s+(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)/;

export function parseVtt(source: string): ParsedTranscript {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  const blocks = text.split(/\n{2,}/);
  const drafts: CueDraft[] = [];
  let teams = false;

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const first = lines[0] ?? "";
    if (/^WEBVTT\b/i.test(first) || /^(NOTE|STYLE|REGION)\b/i.test(first)) continue;
    const timingIndex = lines.findIndex((line) => TIMING.test(line));
    if (timingIndex < 0) continue;
    const timing = lines[timingIndex]?.match(TIMING);
    if (!timing?.[1] || !timing[2]) continue;
    const payload = lines.slice(timingIndex + 1).join("\n");
    if (/<v[\s>]/i.test(payload)) teams = true;
    drafts.push(
      ...payloadToDrafts(payload, parseTimestamp(timing[1].replace(",", ".")), parseTimestamp(timing[2].replace(",", "."))),
    );
  }

  return toTranscript(drafts, teams ? "teams-vtt" : "webvtt");
}

function payloadToDrafts(payload: string, startMs: number | null, endMs: number | null): CueDraft[] {
  const voices = [...payload.matchAll(/<v(?:\s+([^>]+))?>([\s\S]*?)<\/v>/gi)];
  if (voices.length > 0) {
    return voices
      .map((match) => ({
        speaker: cleanSpeaker(match[1] ?? ""),
        startMs,
        endMs,
        text: stripTags(match[2] ?? ""),
      }))
      .filter((draft) => draft.text);
  }

  const plain = stripTags(payload);
  const named = plain.match(/^([^:\n]{2,60}):\s+([\s\S]+)$/);
  if (named?.[1] && named[2]) {
    const speaker = cleanSpeaker(named[1]);
    if (speaker !== "Speaker") {
      return [{ speaker, startMs, endMs, text: named[2] }];
    }
  }
  return [{ speaker: "Speaker", startMs, endMs, text: plain }];
}

function stripTags(value: string): string {
  return value
    .replace(/<\d{2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?>/g, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

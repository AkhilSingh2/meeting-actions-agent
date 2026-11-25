import { parseVtt } from "@/lib/parse/vtt";
import type { ParsedTranscript } from "@/lib/types";

/** SubRip is close enough to WebVTT once a header is implied. Index lines are ignored. */
export function parseSrt(source: string): ParsedTranscript {
  const parsed = parseVtt(`WEBVTT\n\n${source}`);
  return { ...parsed, format: "srt" };
}

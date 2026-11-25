import { parsePlaintext } from "@/lib/parse/plaintext";
import { parseSrt } from "@/lib/parse/srt";
import { parseVtt } from "@/lib/parse/vtt";
import type { ParsedTranscript, TranscriptFormat } from "@/lib/types";

export function formatLabel(format: TranscriptFormat): string {
  switch (format) {
    case "webvtt":
      return "WebVTT";
    case "teams-vtt":
      return "Teams transcript";
    case "srt":
      return "SubRip";
    case "zoom-txt":
      return "Zoom transcript";
    case "meet-txt":
      return "Meet transcript";
    case "dialogue":
      return "Speaker dialogue";
    case "docx":
      return "Word document";
    default:
      return "Plain text";
  }
}

export function parseTranscript(source: string, filename?: string): ParsedTranscript {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  const extension = filename?.split(".").pop()?.toLowerCase();
  if (!text) {
    return { format: "plaintext", cues: [], speakers: [], warnings: ["The transcript was empty."] };
  }
  if (extension === "vtt" || /^WEBVTT\b/.test(text)) return parseVtt(text);
  if (extension === "srt" || looksLikeSrt(text)) return parseSrt(text);
  return parsePlaintext(text);
}

function looksLikeSrt(text: string): boolean {
  if (/^WEBVTT\b/.test(text)) return false;
  const lines = text.split("\n").slice(0, 12);
  return lines.some((line, index) => {
    if (!/-->/.test(line)) return false;
    const previous = lines[index - 1]?.trim() ?? "";
    return previous === "" || /^\d+$/.test(previous);
  });
}

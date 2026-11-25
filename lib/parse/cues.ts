import { unique } from "@/lib/text";
import type { ParsedTranscript, TranscriptCue, TranscriptFormat } from "@/lib/types";

export type CueDraft = {
  speaker: string;
  startMs: number | null;
  endMs: number | null;
  text: string;
};

export function toTranscript(
  drafts: CueDraft[],
  format: TranscriptFormat,
  warnings: string[] = [],
): ParsedTranscript {
  const cues: TranscriptCue[] = [];
  drafts.forEach((draft) => {
    const text = draft.text.replace(/\s+/g, " ").trim();
    if (!text) return;
    const line = cues.length + 1;
    cues.push({
      id: `c${line}`,
      speaker: draft.speaker.trim() || "Speaker",
      startMs: draft.startMs,
      endMs: draft.endMs,
      text,
      line,
    });
  });
  const speakers = unique(cues.map((cue) => cue.speaker).filter((speaker) => speaker !== "Speaker"));
  const nextWarnings = [...warnings];
  if (cues.length === 0) nextWarnings.push("No spoken lines were found.");
  if (cues.length > 0 && speakers.length === 0) {
    nextWarnings.push("No speaker names were found. Owners that depend on “I will” stay unassigned.");
  }
  return { format, cues, speakers, warnings: nextWarnings };
}

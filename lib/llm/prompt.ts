import { formatTimestamp } from "@/lib/dates";
import type { TranscriptCue } from "@/lib/types";

export function buildExtractionPrompt(cues: TranscriptCue[], meetingDate: string, title: string): string {
  const body = cues
    .map((cue) => {
      const stamp = cue.startMs != null ? formatTimestamp(cue.startMs) : "—";
      return `[${cue.id} | ${stamp} | ${cue.speaker}] ${cue.text}`;
    })
    .join("\n");
  return `Extract meeting outcomes from the transcript.
Meeting date: ${meetingDate}
Title: ${title}

Rules:
- Cite only cue ids that appear in the transcript.
- Resolve relative dates against the meeting date and return dueDate as YYYY-MM-DD or null.
- owner is the person who has the work. Use the speaker when they commit with "I will". Use null when nobody is named.
- confidence is how sure you are, from 0 to 1. It is not a probability computed from data.
- Skip small talk and logistics that are not work.
- Do not invent decisions, owners, or dates.

Transcript:
${body}`;
}

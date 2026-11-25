import { chooseEngine } from "@/lib/env";
import { extractHeuristic } from "@/lib/extract/heuristic";
import { extractWithModel } from "@/lib/llm/run";
import { formatLabel, parseTranscript } from "@/lib/parse";
import { parseUpload } from "@/lib/parse/upload";
import { randomId } from "@/lib/id";
import { redact, secretValues } from "@/lib/redact";
import type { EngineRequest, Meeting, MeetingOutcome, ParsedTranscript } from "@/lib/types";

export async function runPipeline(input: {
  text?: string;
  filename?: string;
  buffer?: Buffer;
  title?: string;
  meetingDate: string;
  engine?: EngineRequest;
  env?: Record<string, string | undefined>;
  sample?: boolean;
}): Promise<Meeting> {
  const env = input.env ?? process.env;
  const parsed = input.buffer
    ? await parseUpload({ filename: input.filename ?? "upload.docx", buffer: input.buffer })
    : parseTranscript(input.text ?? "", input.filename);
  const title = input.title?.trim() || titleFrom(input.filename, input.meetingDate);
  const choice = chooseEngine(env, input.engine ?? "auto");
  let outcome: MeetingOutcome;
  if (choice.engine === "llm") {
    try {
      outcome = await extractWithModel(parsed, { title, meetingDate: input.meetingDate }, env);
    } catch (error) {
      outcome = extractHeuristic(parsed, { title, meetingDate: input.meetingDate });
      const message = error instanceof Error ? error.message : "The model request failed.";
      outcome.warnings.unshift(
        `${redact(message, secretValues(env)).slice(0, 240)} Quorum used the heuristic engine instead.`,
      );
    }
  } else {
    outcome = extractHeuristic(parsed, { title, meetingDate: input.meetingDate });
    if (choice.notice) outcome.warnings.unshift(choice.notice);
  }
  return meetingFrom(parsed, outcome, {
    title,
    date: input.meetingDate,
    filename: input.filename,
    sample: input.sample ?? false,
  });
}

export function meetingFrom(
  parsed: ParsedTranscript,
  outcome: MeetingOutcome,
  meta: { title: string; date: string; filename?: string; sample?: boolean; id?: string },
): Meeting {
  return {
    id: meta.id ?? randomId("m"),
    title: meta.title,
    date: meta.date,
    sourceLabel: meta.filename?.toLowerCase().endsWith(".docx") ? "Word document" : formatLabel(parsed.format),
    format: meta.filename?.toLowerCase().endsWith(".docx") ? "docx" : parsed.format,
    createdAt: new Date().toISOString(),
    attendees: parsed.speakers,
    rawText: parsed.cues.map((cue) => `${cue.speaker}: ${cue.text}`).join("\n"),
    cues: parsed.cues,
    outcome,
    sample: meta.sample ?? false,
  };
}

function titleFrom(filename: string | undefined, date: string): string {
  if (!filename) return `Meeting ${date}`;
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || `Meeting ${date}`;
}

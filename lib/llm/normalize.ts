import { isISODate, resolveDueDate } from "@/lib/dates";
import { draftEmail, extractiveSummary } from "@/lib/extract/heuristic";
import { stableId } from "@/lib/id";
import { clamp } from "@/lib/text";
import type { LlmExtraction } from "@/lib/schema";
import type { ActionItem, Citation, ExtractedNote, MeetingOutcome, ParsedTranscript } from "@/lib/types";

export function outcomeFromLlm(
  raw: LlmExtraction,
  transcript: ParsedTranscript,
  meta: { title: string; meetingDate: string; model: string },
): MeetingOutcome {
  const warnings = [...transcript.warnings];
  const byId = new Map(transcript.cues.map((cue) => [cue.id, cue]));
  const cite = (ids: string[], fallback: string): Citation[] => {
    const citations = ids.flatMap((id) => {
      const cue = byId.get(id);
      if (!cue) return [];
      return [
        {
          cueId: cue.id,
          line: cue.line,
          speaker: cue.speaker,
          startMs: cue.startMs,
          quote: cue.text,
        } satisfies Citation,
      ];
    });
    if (citations.length === 0) {
      warnings.push(`Dropped an unknown citation on “${fallback.slice(0, 80)}”.`);
    }
    return citations;
  };

  const decisions: ExtractedNote[] = raw.decisions
    .filter((item) => item.text.trim())
    .map((item) => ({ id: stableId("dec", item.text), text: item.text.trim(), citations: cite(item.cueIds, item.text) }));
  const questions: ExtractedNote[] = raw.questions
    .filter((item) => item.text.trim())
    .map((item) => ({ id: stableId("q", item.text), text: item.text.trim(), citations: cite(item.cueIds, item.text) }));
  const risks: ExtractedNote[] = raw.risks
    .filter((item) => item.text.trim())
    .map((item) => ({ id: stableId("risk", item.text), text: item.text.trim(), citations: cite(item.cueIds, item.text) }));
  const actions: ActionItem[] = raw.actions
    .filter((item) => item.text.trim())
    .map((item) => {
      const citations = cite(item.cueIds, item.text);
      let confidence = clamp(item.confidence, 0, 1);
      if (citations.length === 0) confidence = clamp(confidence - 0.15, 0, 1);
      const dueDate = cleanDue(item.dueDate, meta.meetingDate);
      return {
        id: stableId("act", item.text, item.owner ?? ""),
        text: item.text.trim(),
        owner: item.owner?.trim() || null,
        dueDate,
        confidence: Number(confidence.toFixed(2)),
        status: "open" as const,
        citations,
      };
    });

  const summary = extractiveSummary(transcript.cues, decisions, actions, questions, risks);
  return {
    engine: "llm",
    model: meta.model,
    summary,
    decisions,
    actions,
    questions,
    risks,
    email: draftEmail({
      title: meta.title,
      date: meta.meetingDate,
      summary,
      decisions,
      actions,
      questions,
      risks,
    }),
    warnings,
  };
}

function cleanDue(value: string | null, meetingDate: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (isISODate(trimmed)) return trimmed;
  return resolveDueDate(trimmed, meetingDate);
}

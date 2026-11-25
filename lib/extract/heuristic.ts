import { formatLongDate, resolveDueDate, stripDueClause } from "@/lib/dates";
import { isPersonName, resolveOwner } from "@/lib/extract/owners";
import { splitSentences } from "@/lib/extract/sentences";
import { stableId } from "@/lib/id";
import { capitalize, clamp, collapseSpace, ensurePeriod, jaccard, normalizeApostrophes } from "@/lib/text";
import type {
  ActionItem,
  Citation,
  ExtractedNote,
  MeetingOutcome,
  TranscriptCue,
  ParsedTranscript,
} from "@/lib/types";

const PHRASES = ["follow up", "follow-up", "set up", "circle back", "look into", "sign off", "hand off"];
const VERBS = [
  "send",
  "share",
  "ship",
  "write",
  "review",
  "update",
  "schedule",
  "email",
  "create",
  "draft",
  "fix",
  "deploy",
  "document",
  "prepare",
  "book",
  "publish",
  "investigate",
  "confirm",
  "ping",
  "post",
  "add",
  "check",
  "migrate",
  "test",
  "design",
  "spec",
  "outline",
  "summarize",
  "file",
  "assign",
  "deliver",
  "finalize",
  "revise",
  "record",
  "export",
  "import",
  "notify",
  "bring",
  "present",
  "measure",
  "define",
  "scope",
  "estimate",
  "prototype",
  "implement",
  "merge",
  "remove",
  "replace",
  "rename",
  "invite",
  "collect",
  "gather",
  "compile",
  "audit",
  "triage",
  "reproduce",
  "patch",
  "announce",
  "ask",
  "take",
  "verify",
  "refresh",
  "renew",
];

const DECISION =
  /\b(we decided|we've decided|we have decided|we agree\b|we agreed|agreed to|the decision is|decision:|let's go with|we'll go with|we will go with|we're going with|we are going with|signed off|we approved|approved the|locked in|let's drop|let's keep|let's use|let's cut|let's defer)\b/i;

const RISK =
  /\b(risk|blocker|blocked|concern|worried|might slip|could slip|at risk|dependency|slips|slip|if we don't|if we do not)\b/i;

const NAME = "([\\p{Lu}][\\p{L}'’.-]*(?:\\s+[\\p{Lu}][\\p{L}'’.-]*){0,2})";

type Pattern = "explicit" | "request" | "commit" | "named" | "notes" | "someone" | "group";

type Commitment = {
  pattern: Pattern;
  owner: string | null;
  rest: string;
  fromSpeaker: boolean;
};

export function hasDeliverable(text: string): boolean {
  const lower = text.toLowerCase();
  if (PHRASES.some((phrase) => lower.includes(phrase))) return true;
  return new RegExp(`\\b(${VERBS.join("|")})\\b`, "i").test(text);
}

export function confidenceBand(value: number): "high" | "medium" | "low" {
  if (value >= 0.8) return "high";
  if (value >= 0.62) return "medium";
  return "low";
}

export function bandValue(band: "high" | "medium" | "low"): number {
  if (band === "high") return 0.86;
  if (band === "medium") return 0.68;
  return 0.5;
}

export function extractHeuristic(
  transcript: ParsedTranscript,
  meta: { title: string; meetingDate: string },
): MeetingOutcome {
  const actions: ActionItem[] = [];
  const decisions: ExtractedNote[] = [];
  const questions: ExtractedNote[] = [];
  const risks: ExtractedNote[] = [];

  for (const cue of transcript.cues) {
    for (const sentence of splitSentences(cue.text)) {
      const classified = classify(sentence, cue, transcript.speakers, meta.meetingDate);
      if (!classified) continue;
      if (classified.kind === "action") actions.push(classified.item);
      if (classified.kind === "decision") decisions.push(classified.item);
      if (classified.kind === "question") questions.push(classified.item);
      if (classified.kind === "risk") risks.push(classified.item);
    }
  }

  const outcomeActions = dedupeActions(actions);
  const outcomeDecisions = dedupeNotes(decisions, "dec");
  const outcomeQuestions = dedupeNotes(questions, "q");
  const outcomeRisks = dedupeNotes(risks, "risk");
  const summary = extractiveSummary(
    transcript.cues,
    outcomeDecisions,
    outcomeActions,
    outcomeQuestions,
    outcomeRisks,
  );
  const email = draftEmail({
    title: meta.title,
    date: meta.meetingDate,
    summary,
    decisions: outcomeDecisions,
    actions: outcomeActions,
    questions: outcomeQuestions,
    risks: outcomeRisks,
  });
  const warnings = [...transcript.warnings];
  if (
    outcomeActions.length + outcomeDecisions.length + outcomeQuestions.length + outcomeRisks.length ===
    0
  ) {
    warnings.push("Nothing matched the heuristic. You can add items on the review board.");
  }

  return {
    engine: "heuristic",
    model: null,
    summary,
    decisions: outcomeDecisions,
    actions: outcomeActions,
    questions: outcomeQuestions,
    risks: outcomeRisks,
    email,
    warnings,
  };
}

type Classified =
  | { kind: "action"; item: ActionItem }
  | { kind: "decision" | "question" | "risk"; item: ExtractedNote };

function classify(
  sentence: string,
  cue: TranscriptCue,
  speakers: string[],
  meetingDate: string,
): Classified | null {
  const text = collapseSpace(normalizeApostrophes(sentence));
  const commitment = matchCommitment(text, speakers);
  const deliverable = commitment ? hasDeliverable(commitment.rest) || commitment.pattern === "explicit" : false;
  if (commitment && deliverable && !(commitment.pattern === "group" && !resolveDueDate(text, meetingDate))) {
    const dueDate = resolveDueDate(text, meetingDate);
    const rawOwner = commitment.fromSpeaker
      ? cue.speaker !== "Speaker"
        ? cue.speaker
        : null
      : commitment.owner;
    const owner = rawOwner ? resolveOwner(rawOwner, speakers) : null;
    const task = taskText(commitment.rest);
    if (task.length > 1) {
      return {
        kind: "action",
        item: {
          id: stableId("act", task, owner ?? ""),
          text: task,
          owner,
          dueDate,
          confidence: scoreConfidence(commitment.pattern, Boolean(owner), Boolean(dueDate)),
          status: "open",
          citations: [cite(cue, text)],
        },
      };
    }
  }

  if (isDecision(text)) {
    return { kind: "decision", item: note("dec", text, cue) };
  }
  if (RISK.test(text) && text.split(/\s+/).length >= 5) {
    return { kind: "risk", item: note("risk", text, cue) };
  }
  if (isQuestion(text)) {
    return { kind: "question", item: note("q", text, cue) };
  }
  return null;
}

function matchCommitment(sentence: string, speakers: string[], depth = 0): Commitment | null {
  if (depth > 2) return null;
  const explicit = sentence.match(/^(?:action(?:\s+item)?|todo|to-do|next step)\s*[:\-]\s*(.+)$/i);
  if (explicit?.[1]) {
    const inner = matchCommitment(explicit[1], speakers, depth + 1);
    if (inner) return { ...inner, pattern: "explicit" };
    return { pattern: "explicit", owner: null, rest: explicit[1], fromSpeaker: false };
  }

  const request = sentence.match(new RegExp(`^${NAME},\\s+can you\\s+(?:please\\s+)?(?:also\\s+)?(.+)$`, "iu"));
  if (request?.[1] && request[2] && isPersonName(request[1])) {
    return { pattern: "request", owner: request[1].trim(), rest: request[2], fromSpeaker: false };
  }

  const commit = sentence.match(/^(I'll|I will|I can|I'm going to|I am going to)\s+(.+)$/i);
  if (commit?.[2]) {
    return { pattern: "commit", owner: null, rest: commit[2], fromSpeaker: true };
  }

  const named = sentence.match(new RegExp(`^${NAME}\\s+will\\s+(.+)$`, "iu"));
  if (named?.[1] && named[2] && isPersonName(named[1])) {
    return { pattern: "named", owner: named[1].trim(), rest: named[2], fromSpeaker: false };
  }

  const notes = sentence.match(new RegExp(`^${NAME}\\s+to\\s+(.+)$`, "iu"));
  if (notes?.[1] && notes[2] && isPersonName(notes[1]) && knownSpeaker(notes[1], speakers)) {
    return { pattern: "notes", owner: notes[1].trim(), rest: notes[2], fromSpeaker: false };
  }

  const someone = sentence.match(/^(?:someone|somebody)\s+needs to\s+(.+)$/i);
  if (someone?.[1]) return { pattern: "someone", owner: null, rest: someone[1], fromSpeaker: false };

  const group = sentence.match(/^(?:we|the team)\s+(?:need to|will)\s+(.+)$/i);
  if (group?.[1]) return { pattern: "group", owner: null, rest: group[1], fromSpeaker: false };

  return null;
}

function knownSpeaker(name: string, speakers: string[]): boolean {
  const cleaned = name.trim().toLowerCase();
  return speakers.some((speaker) => {
    const lower = speaker.toLowerCase();
    return lower === cleaned || lower.split(/\s+/)[0] === cleaned;
  });
}

function isDecision(sentence: string): boolean {
  if (!DECISION.test(sentence)) return false;
  if (/^(did|do|have|are|should|can|could)\s+we\b/i.test(sentence)) return false;
  return true;
}

function isQuestion(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (!trimmed.endsWith("?")) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 5) return false;
  if (/^(right|ok|okay|yeah|yes|cool|sure)\?$/i.test(trimmed)) return false;
  if (/^(can you|could you|would you)\b/i.test(trimmed) && !hasDeliverable(trimmed)) return false;
  return true;
}

function scoreConfidence(pattern: Pattern, owner: boolean, date: boolean): number {
  const base: Record<Pattern, number> = {
    explicit: 0.9,
    request: 0.8,
    commit: 0.78,
    named: 0.78,
    notes: 0.74,
    someone: 0.58,
    group: 0.56,
  };
  let score = base[pattern];
  if (date) score += 0.06;
  if (!owner && pattern !== "someone" && pattern !== "group") score -= 0.08;
  return clamp(Number(score.toFixed(2)), 0.4, 0.95);
}

function taskText(rest: string): string {
  const stripped = stripDueClause(
    rest
      .replace(/[.?!]+$/, "")
      .replace(/^(?:also|please)\s+/i, "")
      .trim(),
  );
  return capitalize(collapseSpace(stripped));
}

function cite(cue: TranscriptCue, quote: string): Citation {
  return {
    cueId: cue.id,
    line: cue.line,
    speaker: cue.speaker,
    startMs: cue.startMs,
    quote,
  };
}

function note(prefix: string, text: string, cue: TranscriptCue): ExtractedNote {
  return {
    id: stableId(prefix, text),
    text,
    citations: [cite(cue, text)],
  };
}

function dedupeActions(items: ActionItem[]): ActionItem[] {
  const kept: ActionItem[] = [];
  for (const item of items) {
    const existing = kept.find((candidate) => jaccard(candidate.text, item.text) > 0.72);
    if (!existing) {
      kept.push(item);
      continue;
    }
    if (item.confidence > existing.confidence) {
      kept[kept.indexOf(existing)] = item;
    }
  }
  return kept;
}

function dedupeNotes(items: ExtractedNote[], prefix: string): ExtractedNote[] {
  const kept: ExtractedNote[] = [];
  for (const item of items) {
    if (kept.some((candidate) => jaccard(candidate.text, item.text) > 0.72)) continue;
    kept.push({ ...item, id: stableId(prefix, item.text) });
  }
  return kept;
}

export function extractiveSummary(
  cues: TranscriptCue[],
  decisions: ExtractedNote[],
  actions: ActionItem[],
  questions: ExtractedNote[],
  risks: ExtractedNote[],
): string {
  const order = new Map(cues.map((cue, index) => [cue.id, index]));
  const pieces = [
    ...decisions.slice(0, 2).map((item) => piece(item.citations[0]?.cueId ?? "", item.text)),
    ...actions.slice(0, 2).map((item) => piece(item.citations[0]?.cueId ?? "", item.citations[0]?.quote || item.text)),
    ...questions.slice(0, 1).map((item) => piece(item.citations[0]?.cueId ?? "", item.text)),
    ...risks.slice(0, 1).map((item) => piece(item.citations[0]?.cueId ?? "", item.text)),
  ].filter((item) => item.text);
  pieces.sort((a, b) => (order.get(a.cueId) ?? 0) - (order.get(b.cueId) ?? 0));

  const chosen: string[] = [];
  const context = firstContext(cues);
  if (context && !pieces.some((item) => jaccard(item.text, context) > 0.6)) chosen.push(ensurePeriod(context));
  for (const item of pieces) {
    if (chosen.some((existing) => jaccard(existing, item.text) > 0.6)) continue;
    chosen.push(ensurePeriod(item.text));
  }
  if (chosen.length > 0) return chosen.join(" ");
  return "No decisions, commitments, questions, or risks were extracted.";
}

function piece(cueId: string, text: string): { cueId: string; text: string } {
  return { cueId, text };
}

function firstContext(cues: TranscriptCue[]): string | null {
  for (const cue of cues) {
    for (const sentence of splitSentences(cue.text)) {
      if (isThanks(sentence)) continue;
      if (sentence.split(/\s+/).length < 8) continue;
      return sentence;
    }
  }
  return null;
}

function isThanks(sentence: string): boolean {
  return /^(thanks|thank you|hi|hello|hey)\b/i.test(sentence.trim());
}

export function draftEmail(input: {
  title: string;
  date: string;
  summary: string;
  decisions: ExtractedNote[];
  actions: ActionItem[];
  questions: ExtractedNote[];
  risks: ExtractedNote[];
}): { subject: string; body: string } {
  const lines = [
    "Hello,",
    "",
    `Notes from ${input.title} (${formatLongDate(input.date)}).`,
    "",
    input.summary,
    "",
    "Decisions",
    ...(input.decisions.length
      ? input.decisions.map((item) => `- ${item.text}`)
      : ["- None recorded."]),
    "",
    "Action items",
    ...(input.actions.length
      ? input.actions.map((item) => {
          const due = item.dueDate ? ` (due ${item.dueDate})` : "";
          return `- ${item.owner ?? "Unassigned"}: ${item.text}${due}`;
        })
      : ["- None recorded."]),
    "",
    "Open questions",
    ...(input.questions.length ? input.questions.map((item) => `- ${item.text}`) : ["- None recorded."]),
    "",
    "Risks",
    ...(input.risks.length ? input.risks.map((item) => `- ${item.text}`) : ["- None recorded."]),
    "",
    "Please reply with corrections.",
    "",
    "—",
    "Drafted with Quorum",
  ];
  return { subject: `Follow-up: ${input.title}`, body: lines.join("\n") };
}

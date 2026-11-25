export type TranscriptFormat =
  | "webvtt"
  | "teams-vtt"
  | "srt"
  | "zoom-txt"
  | "meet-txt"
  | "dialogue"
  | "docx"
  | "plaintext";

export type TranscriptCue = {
  id: string;
  speaker: string;
  startMs: number | null;
  endMs: number | null;
  text: string;
  line: number;
};

export type ParsedTranscript = {
  format: TranscriptFormat;
  cues: TranscriptCue[];
  speakers: string[];
  warnings: string[];
};

export type Citation = {
  cueId: string;
  line: number;
  speaker: string;
  startMs: number | null;
  quote: string;
};

export type ActionStatus = "open" | "in_progress" | "done" | "dropped";

export type ActionItem = {
  id: string;
  text: string;
  owner: string | null;
  dueDate: string | null;
  confidence: number;
  status: ActionStatus;
  citations: Citation[];
};

export type ExtractedNote = {
  id: string;
  text: string;
  citations: Citation[];
};

export type EngineName = "heuristic" | "llm";

export type MeetingOutcome = {
  engine: EngineName;
  model: string | null;
  summary: string;
  decisions: ExtractedNote[];
  actions: ActionItem[];
  questions: ExtractedNote[];
  risks: ExtractedNote[];
  email: { subject: string; body: string };
  warnings: string[];
};

export type Meeting = {
  id: string;
  title: string;
  date: string;
  sourceLabel: string;
  format: TranscriptFormat;
  createdAt: string;
  attendees: string[];
  rawText: string;
  cues: TranscriptCue[];
  outcome: MeetingOutcome;
  sample: boolean;
};

export type ExportTarget =
  | "markdown"
  | "csv"
  | "ics"
  | "jira"
  | "linear"
  | "github"
  | "notion"
  | "slack";

export type EngineRequest = "auto" | "heuristic" | "llm";

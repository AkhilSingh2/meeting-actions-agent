import { z } from "zod";

const citationSchema = z.object({
  cueId: z.string(),
  line: z.number(),
  speaker: z.string(),
  startMs: z.number().nullable(),
  quote: z.string(),
});

const noteSchema = z.object({
  id: z.string(),
  text: z.string(),
  citations: z.array(citationSchema),
});

const actionSchema = z.object({
  id: z.string(),
  text: z.string(),
  owner: z.string().nullable(),
  dueDate: z.string().nullable(),
  confidence: z.number(),
  status: z.enum(["open", "in_progress", "done", "dropped"]),
  citations: z.array(citationSchema),
});

export const outcomeSchema = z.object({
  engine: z.enum(["heuristic", "llm"]),
  model: z.string().nullable(),
  summary: z.string(),
  decisions: z.array(noteSchema),
  actions: z.array(actionSchema),
  questions: z.array(noteSchema),
  risks: z.array(noteSchema),
  email: z.object({ subject: z.string(), body: z.string() }),
  warnings: z.array(z.string()),
});

export const meetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  sourceLabel: z.string(),
  format: z.enum([
    "webvtt",
    "teams-vtt",
    "srt",
    "zoom-txt",
    "meet-txt",
    "dialogue",
    "docx",
    "plaintext",
  ]),
  createdAt: z.string(),
  attendees: z.array(z.string()),
  rawText: z.string(),
  cues: z.array(
    z.object({
      id: z.string(),
      speaker: z.string(),
      startMs: z.number().nullable(),
      endMs: z.number().nullable(),
      text: z.string(),
      line: z.number(),
    }),
  ),
  outcome: outcomeSchema,
  sample: z.boolean(),
});

export const persistedSchema = z.object({
  version: z.literal(1),
  meetings: z.array(z.unknown()),
  removedSeedIds: z.array(z.string()),
});

export const llmExtractionSchema = z.object({
  decisions: z.array(
    z.object({
      text: z.string().describe("The decision in the speaker's words."),
      cueIds: z.array(z.string()).describe("Cue ids that support this decision."),
    }),
  ),
  actions: z.array(
    z.object({
      text: z.string().describe("Imperative task, without the owner's name."),
      owner: z.string().nullable().describe("Person responsible, or null."),
      dueDate: z.string().nullable().describe("YYYY-MM-DD, or null."),
      confidence: z.number().min(0).max(1),
      cueIds: z.array(z.string()),
    }),
  ),
  questions: z.array(
    z.object({
      text: z.string(),
      cueIds: z.array(z.string()),
    }),
  ),
  risks: z.array(
    z.object({
      text: z.string(),
      cueIds: z.array(z.string()),
    }),
  ),
});

export type LlmExtraction = z.infer<typeof llmExtractionSchema>;

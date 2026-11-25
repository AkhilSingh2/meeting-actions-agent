import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { buildExtractionPrompt } from "@/lib/llm/prompt";
import { outcomeFromLlm } from "@/lib/llm/normalize";
import { llmExtractionSchema } from "@/lib/schema";
import type { MeetingOutcome, ParsedTranscript } from "@/lib/types";

export async function extractWithModel(
  transcript: ParsedTranscript,
  meta: { title: string; meetingDate: string },
  env: Record<string, string | undefined>,
): Promise<MeetingOutcome> {
  const resolved = resolveModel(env);
  const { output } = await generateText({
    model: resolved.model,
    output: Output.object({
      schema: llmExtractionSchema,
      name: "meeting_outcomes",
      description: "Decisions, action items, questions, and risks cited to transcript cues.",
    }),
    prompt: buildExtractionPrompt(transcript.cues, meta.meetingDate, meta.title),
  });
  if (!output) throw new Error("The model returned no structured output.");
  return outcomeFromLlm(output, transcript, { ...meta, model: resolved.name });
}

function resolveModel(env: Record<string, string | undefined>): { model: Parameters<typeof generateText>[0]["model"]; name: string } {
  const modelId = env.LLM_MODEL?.trim();
  if (!modelId) throw new Error("Set LLM_MODEL to use a live model.");
  const provider = (env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (provider === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) throw new Error("Set ANTHROPIC_API_KEY.");
    return {
      model: createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(modelId),
      name: `anthropic/${modelId}`,
    };
  }
  if (provider === "ollama") {
    return {
      model: createOpenAI({
        baseURL: env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1",
        apiKey: env.OLLAMA_API_KEY || "ollama",
      })(modelId),
      name: `ollama/${modelId}`,
    };
  }
  if (!env.OPENAI_API_KEY) throw new Error("Set OPENAI_API_KEY.");
  return {
    model: createOpenAI({ apiKey: env.OPENAI_API_KEY })(modelId),
    name: `openai/${modelId}`,
  };
}

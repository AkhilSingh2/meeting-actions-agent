import type { EngineRequest } from "@/lib/types";

export function isDemoMode(env: Record<string, string | undefined> = process.env): boolean {
  return (env.DEMO_MODE ?? "true").toLowerCase() !== "false";
}

export type LlmReadiness = {
  configured: boolean;
  provider: string;
  reason: string | null;
};

export function llmReadiness(env: Record<string, string | undefined> = process.env): LlmReadiness {
  const provider = (env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (isDemoMode(env)) {
    return { configured: false, provider, reason: "Demo mode is on. Set DEMO_MODE=false to call a model." };
  }
  if (!env.LLM_MODEL?.trim()) {
    return { configured: false, provider, reason: "Set LLM_MODEL to call a model." };
  }
  if (provider === "anthropic" && !env.ANTHROPIC_API_KEY) {
    return { configured: false, provider, reason: "Set ANTHROPIC_API_KEY." };
  }
  if (provider === "ollama") return { configured: true, provider, reason: null };
  if (!env.OPENAI_API_KEY) {
    return { configured: false, provider, reason: "Set OPENAI_API_KEY." };
  }
  return { configured: true, provider, reason: null };
}

export function chooseEngine(env: Record<string, string | undefined>, requested: EngineRequest): {
  engine: "heuristic" | "llm";
  notice: string | null;
  provider: string;
} {
  const readiness = llmReadiness(env);
  if (requested === "heuristic" || !readiness.configured) {
    return {
      engine: "heuristic",
      notice: requested === "heuristic" ? null : readiness.reason,
      provider: readiness.provider,
    };
  }
  return { engine: "llm", notice: null, provider: readiness.provider };
}

export type ExporterName = "jira" | "linear" | "github" | "notion" | "slack";

export function exporterReadiness(env: Record<string, string | undefined> = process.env): Record<ExporterName, boolean> {
  return {
    jira: Boolean(env.JIRA_BASE_URL && env.JIRA_EMAIL && env.JIRA_API_TOKEN && env.JIRA_PROJECT_KEY),
    linear: Boolean(env.LINEAR_API_KEY && env.LINEAR_TEAM_ID),
    github: Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO),
    notion: Boolean(env.NOTION_TOKEN && env.NOTION_DATABASE_ID),
    slack: Boolean(env.SLACK_BOT_TOKEN && env.SLACK_CHANNEL_ID),
  };
}

export function missingExporterVars(target: ExporterName, env: Record<string, string | undefined> = process.env): string[] {
  const required: Record<ExporterName, string[]> = {
    jira: ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY"],
    linear: ["LINEAR_API_KEY", "LINEAR_TEAM_ID"],
    github: ["GITHUB_TOKEN", "GITHUB_REPO"],
    notion: ["NOTION_TOKEN", "NOTION_DATABASE_ID"],
    slack: ["SLACK_BOT_TOKEN", "SLACK_CHANNEL_ID"],
  };
  return required[target].filter((key) => !env[key]);
}

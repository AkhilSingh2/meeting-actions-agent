import { exporterReadiness, llmReadiness, type ExporterName } from "@/lib/env";
import { buildPlan } from "@/lib/export/plan";
import { runPipeline } from "@/lib/pipeline";
import { meetingSchema } from "@/lib/schema";
import { STATIC_DEMO } from "@/lib/demo/static-demo";

/**
 * Static demo (GitHub Pages): the three API routes are answered in the browser with
 * the same pipeline and export planner. There are no keys here, so the heuristic
 * engine runs and every export is a dry run.
 */
const env: Record<string, string | undefined> = { DEMO_MODE: "true" };
const targets = new Set<ExporterName>(["jira", "linear", "github", "notion", "slack"]);
const json = (body: unknown, status = 200) => Response.json(body, { status });
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

async function extract(init: RequestInit): Promise<Response> {
  try {
    let text = "";
    let filename: string | undefined;
    let title = "";
    let meetingDate = "";
    if (init.body instanceof FormData) {
      const file = init.body.get("file");
      if (!(file instanceof File)) return json({ error: "Choose a .vtt, .srt, or .txt file." }, 400);
      if (/\.docx$/i.test(file.name)) {
        return json({ error: "Word files are parsed on the server. In this demo, use a .vtt, .srt, or .txt export, or paste the text." }, 400);
      }
      if (file.size > 2_000_000) return json({ error: "That file is larger than 2 MB." }, 400);
      text = await file.text();
      filename = file.name;
      title = String(init.body.get("title") ?? "");
      meetingDate = String(init.body.get("meetingDate") ?? "");
    } else {
      const body = JSON.parse(String(init.body ?? "{}")) as { text?: string; filename?: string; title?: string; meetingDate?: string };
      text = body.text ?? "";
      filename = body.filename;
      title = body.title ?? "";
      meetingDate = body.meetingDate ?? "";
    }
    if (!text.trim()) return json({ error: "Paste a transcript or choose a file." }, 400);
    if (text.length > 200_000) return json({ error: "That transcript is longer than 200,000 characters." }, 400);
    if (!isDate(meetingDate)) return json({ error: "Enter a meeting date." }, 400);
    const meeting = await runPipeline({ text, filename, title: title.slice(0, 120), meetingDate, engine: "heuristic", env });
    if (meeting.cues.length === 0) return json({ error: "No spoken lines were found in that transcript." }, 400);
    return json({ meeting });
  } catch {
    return json({ error: "Quorum could not read that transcript." }, 400);
  }
}

function exportPlan(init: RequestInit): Response {
  const body = JSON.parse(String(init.body ?? "{}")) as { target?: string; meeting?: unknown };
  if (!body.target || !targets.has(body.target as ExporterName)) {
    return json({ error: "Choose Jira, Linear, GitHub, Notion, or Slack." }, 400);
  }
  const parsed = meetingSchema.safeParse(body.meeting);
  if (!parsed.success) return json({ error: "The meeting record is invalid." }, 400);
  const plan = buildPlan(body.target as ExporterName, parsed.data, env, false);
  return json({ mode: "dry-run", plan, results: [], reason: "Demo mode stops before the network." });
}

export function installStaticApi(): void {
  if (!STATIC_DEMO || typeof window === "undefined") return;
  const flagged = window as typeof window & { __quorumDemo?: boolean };
  if (flagged.__quorumDemo) return;
  flagged.__quorumDemo = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return original(input, init);
    if (url.pathname === "/api/status") return json({ demoMode: true, llm: llmReadiness(env), exporters: exporterReadiness(env) });
    if (url.pathname === "/api/extract") return extract(init);
    if (url.pathname === "/api/export") return exportPlan(init);
    return json({ error: "Not available in the static demo." }, 404);
  };
}

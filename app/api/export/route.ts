import { deliverRequests } from "@/lib/export/deliver";
import { assertDeliverableUrl, buildPlan, validGithubRepo } from "@/lib/export/plan";
import { isDemoMode, type ExporterName } from "@/lib/env";
import { secretValues } from "@/lib/redact";
import { meetingSchema } from "@/lib/schema";

export const runtime = "nodejs";

const targets = new Set<ExporterName>(["jira", "linear", "github", "notion", "slack"]);

export async function POST(request: Request) {
  const body = (await request.json()) as { target?: string; meeting?: unknown; deliver?: boolean };
  if (!body.target || !targets.has(body.target as ExporterName)) {
    return Response.json({ error: "Choose Jira, Linear, GitHub, Notion, or Slack." }, { status: 400 });
  }
  const parsed = meetingSchema.safeParse(body.meeting);
  if (!parsed.success) return Response.json({ error: "The meeting record is invalid." }, { status: 400 });
  const target = body.target as ExporterName;
  const plan = buildPlan(target, parsed.data, process.env, false);
  const demo = isDemoMode();
  if (!body.deliver || demo || plan.missing.length > 0) {
    return Response.json({
      mode: "dry-run",
      plan,
      results: [],
      reason: demo
        ? "Demo mode stops before the network."
        : plan.missing.length > 0
          ? `Missing ${plan.missing.join(", ")}.`
          : "Preview only.",
    });
  }
  if (target === "github" && !validGithubRepo(process.env.GITHUB_REPO)) {
    return Response.json({ error: "GITHUB_REPO must look like owner/name." }, { status: 400 });
  }
  try {
    const secretPlan = buildPlan(target, parsed.data, process.env, true);
    for (const item of secretPlan.requests) assertDeliverableUrl(item.url);
    const results = await deliverRequests(secretPlan.requests, secretValues(process.env));
    return Response.json({ mode: "live", plan, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The export failed.";
    return Response.json({ error: message.slice(0, 240) }, { status: 502 });
  }
}

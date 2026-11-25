import { describe, expect, it } from "vitest";
import { deliverRequests } from "@/lib/export/deliver";
import { toCsv, toIcs, toMarkdown } from "@/lib/export/files";
import { buildPlan, validGithubRepo } from "@/lib/export/plan";
import { buildSeedMeetings } from "@/lib/samples/seed";

const meeting = buildSeedMeetings("2026-11-25").find((item) => item.id === "northline-critique");
if (!meeting) throw new Error("missing sample");

describe("exporters", () => {
  it("writes markdown, csv, and an all-day calendar", () => {
    const markdown = toMarkdown(meeting);
    expect(markdown).toContain("# Northline critique");
    expect(markdown).toContain("## Action items");
    const csv = toCsv(meeting);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("meeting_title,meeting_date,kind");
    expect(csv).toContain("feature flag");
    const ics = toIcs(meeting, "20260303T120000Z");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:");
    expect(ics).not.toContain("dropped");
  });

  it("previews Jira without revealing the token", () => {
    const plan = buildPlan("jira", meeting, {
      JIRA_BASE_URL: "https://example.atlassian.net",
      JIRA_EMAIL: "ada@example.com",
      JIRA_API_TOKEN: "super-secret-token",
      JIRA_PROJECT_KEY: "NORTH",
    });
    expect(plan.missing).toEqual([]);
    expect(plan.requests.length).toBeGreaterThan(0);
    const encoded = JSON.stringify(plan);
    expect(encoded).not.toContain("super-secret-token");
    expect(encoded).toContain("Basic ••••");
    expect(plan.requests[0]?.url).toBe("https://example.atlassian.net/rest/api/3/issue");
    const body = plan.requests[0]?.body as { fields: { project: { key: string } } };
    expect(body.fields.project.key).toBe("NORTH");
  });

  it("lists missing Linear variables and still shows a placeholder request", () => {
    const plan = buildPlan("linear", meeting, {});
    expect(plan.missing).toEqual(["LINEAR_API_KEY", "LINEAR_TEAM_ID"]);
    expect(plan.requests[0]?.url).toBe("https://api.linear.app/graphql");
  });

  it("rejects a malformed GitHub repo before a live send would use it", () => {
    expect(validGithubRepo("owner/repo")).toBe(true);
    expect(validGithubRepo("https://github.com/owner/repo")).toBe(false);
  });

  it("does not call the network while building a plan, and deliver uses the injected fetch", async () => {
    const plan = buildPlan(
      "slack",
      meeting,
      { SLACK_BOT_TOKEN: "xoxb-secret-value", SLACK_CHANNEL_ID: "C123" },
      true,
    );
    const calls: string[] = [];
    const results = await deliverRequests(plan.requests, ["xoxb-secret-value"], async (url) => {
      calls.push(String(url));
      return new Response("ok", { status: 200 });
    });
    expect(calls).toEqual(["https://slack.com/api/chat.postMessage"]);
    expect(results[0]?.ok).toBe(true);
  });
});

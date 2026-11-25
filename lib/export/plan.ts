import { formatTimestamp } from "@/lib/dates";
import { missingExporterVars, type ExporterName } from "@/lib/env";
import { redactHeaders } from "@/lib/redact";
import type { ActionItem, Meeting } from "@/lib/types";

export type PlannedRequest = {
  method: "POST";
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

export type ExportPlan = {
  target: ExporterName;
  requests: PlannedRequest[];
  missing: string[];
  note: string;
};

export function buildPlan(target: ExporterName, meeting: Meeting, env: Record<string, string | undefined>, revealSecrets = false): ExportPlan {
  const missing = missingExporterVars(target, env);
  const actions = meeting.outcome.actions.filter((action) => action.text.trim() && action.status !== "dropped");
  const requests = requestsFor(target, meeting, actions, env);
  const secrets = revealSecrets ? [] : secretList(env);
  return {
    target,
    missing,
    note:
      actions.length === 0 && target !== "slack"
        ? "There are no open action items to send. Dropped items are skipped."
        : "Preview shows the request Quorum would send.",
    requests: requests.map((request) => ({
      ...request,
      headers: revealSecrets ? request.headers : redactHeaders(request.headers, secrets),
    })),
  };
}

function requestsFor(
  target: ExporterName,
  meeting: Meeting,
  actions: ActionItem[],
  env: Record<string, string | undefined>,
): PlannedRequest[] {
  if (target === "slack") return [slackRequest(meeting, actions, env)];
  return actions.map((action) => {
    if (target === "jira") return jiraRequest(meeting, action, env);
    if (target === "linear") return linearRequest(meeting, action, env);
    if (target === "github") return githubRequest(meeting, action, env);
    return notionRequest(meeting, action, env);
  });
}

function jiraRequest(meeting: Meeting, action: ActionItem, env: Record<string, string | undefined>): PlannedRequest {
  const base = (env.JIRA_BASE_URL || "https://example.atlassian.net").replace(/\/$/, "");
  const email = env.JIRA_EMAIL || "you@example.com";
  const token = env.JIRA_API_TOKEN || "jira-token";
  const description = describe(meeting, action);
  return {
    method: "POST",
    url: `${base}/rest/api/3/issue`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: {
      fields: {
        project: { key: env.JIRA_PROJECT_KEY || "PROJECT" },
        summary: clip(`${action.owner ? `${action.owner}: ` : ""}${action.text}`, 250),
        issuetype: { name: env.JIRA_ISSUE_TYPE || "Task" },
        ...(action.dueDate ? { duedate: action.dueDate } : {}),
        description: {
          type: "doc",
          version: 1,
          content: description.split("\n").map((line) => ({
            type: "paragraph",
            content: [{ type: "text", text: line || " " }],
          })),
        },
      },
    },
  };
}

function linearRequest(meeting: Meeting, action: ActionItem, env: Record<string, string | undefined>): PlannedRequest {
  return {
    method: "POST",
    url: "https://api.linear.app/graphql",
    headers: {
      Authorization: env.LINEAR_API_KEY || "linear-key",
      "Content-Type": "application/json",
    },
    body: {
      query: `mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) { success issue { id identifier url } }
}`,
      variables: {
        input: {
          teamId: env.LINEAR_TEAM_ID || "TEAM_ID",
          title: clip(`${action.owner ? `${action.owner}: ` : ""}${action.text}`, 240),
          description: describe(meeting, action),
          ...(action.dueDate ? { dueDate: action.dueDate } : {}),
        },
      },
    },
  };
}

function githubRequest(meeting: Meeting, action: ActionItem, env: Record<string, string | undefined>): PlannedRequest {
  const repo = env.GITHUB_REPO || "owner/repo";
  return {
    method: "POST",
    url: `https://api.github.com/repos/${repo}/issues`,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN || "github-token"}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: {
      title: clip(`${action.owner ? `${action.owner}: ` : ""}${action.text}`, 240),
      body: describe(meeting, action),
    },
  };
}

function notionRequest(meeting: Meeting, action: ActionItem, env: Record<string, string | undefined>): PlannedRequest {
  const titleProperty = env.NOTION_TITLE_PROPERTY || "Name";
  return {
    method: "POST",
    url: "https://api.notion.com/v1/pages",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN || "notion-token"}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: {
      parent: { database_id: env.NOTION_DATABASE_ID || "database-id" },
      properties: {
        [titleProperty]: {
          title: [{ type: "text", text: { content: clip(action.text, 200) } }],
        },
      },
      children: describe(meeting, action)
        .split("\n")
        .map((line) => ({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: clip(line, 1800) } }] },
        })),
    },
  };
}

function slackRequest(meeting: Meeting, actions: ActionItem[], env: Record<string, string | undefined>): PlannedRequest {
  const actionLines = actions.length
    ? actions
        .map((action) => {
          const due = action.dueDate ? ` · due ${action.dueDate}` : "";
          return `• ${action.owner ?? "Unassigned"}: ${action.text}${due}`;
        })
        .join("\n")
    : "No action items.";
  const summary = clip(meeting.outcome.summary, 2800);
  return {
    method: "POST",
    url: "https://slack.com/api/chat.postMessage",
    headers: {
      Authorization: `Bearer ${env.SLACK_BOT_TOKEN || "slack-token"}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: {
      channel: env.SLACK_CHANNEL_ID || "C0123456789",
      text: `${meeting.title}: ${summary}`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: clip(meeting.title, 150) } },
        { type: "section", text: { type: "mrkdwn", text: summary } },
        { type: "section", text: { type: "mrkdwn", text: clip(actionLines, 2800) } },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `${meeting.date} · drafted with Quorum` }],
        },
      ],
    },
  };
}

export function describe(meeting: Meeting, action: ActionItem): string {
  const citation = action.citations[0];
  const when = citation
    ? citation.startMs != null
      ? formatTimestamp(citation.startMs)
      : `line ${citation.line}`
    : "uncited";
  const quote = citation?.quote ? `“${citation.quote}”` : "";
  return [
    action.text,
    `Owner: ${action.owner ?? "Unassigned"}`,
    action.dueDate ? `Due: ${action.dueDate}` : "Due: none",
    `Meeting: ${meeting.title} (${meeting.date})`,
    `Cited: ${when}${citation?.speaker ? `, ${citation.speaker}` : ""} ${quote}`.trim(),
  ].join("\n");
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function secretList(env: Record<string, string | undefined>): string[] {
  return [env.JIRA_API_TOKEN, env.JIRA_EMAIL, env.LINEAR_API_KEY, env.GITHUB_TOKEN, env.NOTION_TOKEN, env.SLACK_BOT_TOKEN].filter(
    (value): value is string => Boolean(value),
  );
}

export function validGithubRepo(repo: string | undefined): boolean {
  return Boolean(repo && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo));
}

export function assertDeliverableUrl(url: string): void {
  const parsed = new URL(url);
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !local) {
    throw new Error("Refusing a non-HTTPS endpoint.");
  }
}

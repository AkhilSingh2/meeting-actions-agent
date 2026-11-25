import { formatTimestamp } from "@/lib/dates";
import { stableId } from "@/lib/id";
import { slugify } from "@/lib/text";
import type { ActionItem, Meeting } from "@/lib/types";

export function toMarkdown(meeting: Meeting): string {
  const lines = [
    `# ${meeting.title}`,
    "",
    `_${meeting.date} · ${meeting.attendees.join(", ") || "Speakers not named"}_`,
    "",
    `Source: ${meeting.sourceLabel}. Engine: ${meeting.outcome.engine}.`,
    "",
    "## Summary",
    "",
    meeting.outcome.summary,
    "",
    "## Decisions",
    "",
    ...listOrNone(meeting.outcome.decisions.map((item) => `- ${item.text} ${cite(item.citations[0])}`)),
    "",
    "## Action items",
    "",
    ...listOrNone(
      meeting.outcome.actions.filter(hasText).map((action) => {
        const box = action.status === "done" ? "x" : " ";
        const owner = action.owner ?? "Unassigned";
        const due = action.dueDate ? ` · due ${action.dueDate}` : "";
        return `- [${box}] **${owner}** — ${action.text}${due} · ${action.status.replace("_", " ")} ${cite(action.citations[0])}`;
      }),
    ),
    "",
    "## Open questions",
    "",
    ...listOrNone(meeting.outcome.questions.map((item) => `- ${item.text} ${cite(item.citations[0])}`)),
    "",
    "## Risks",
    "",
    ...listOrNone(meeting.outcome.risks.map((item) => `- ${item.text} ${cite(item.citations[0])}`)),
    "",
    "## Follow-up email",
    "",
    `Subject: ${meeting.outcome.email.subject}`,
    "",
    meeting.outcome.email.body,
    "",
  ];
  return lines.join("\n");
}

export function toCsv(meeting: Meeting): string {
  const rows = [
    ["meeting_title", "meeting_date", "kind", "text", "owner", "due_date", "status", "confidence", "citation", "speaker"],
  ];
  const push = (kind: string, text: string, extra: Partial<Record<string, string>>) => {
    rows.push([
      meeting.title,
      meeting.date,
      kind,
      text,
      extra.owner ?? "",
      extra.due ?? "",
      extra.status ?? "",
      extra.confidence ?? "",
      extra.citation ?? "",
      extra.speaker ?? "",
    ]);
  };
  push("summary", meeting.outcome.summary, {});
  for (const item of meeting.outcome.decisions) {
    const citation = item.citations[0];
    push("decision", item.text, { citation: citationLabel(citation), speaker: citation?.speaker ?? "" });
  }
  for (const action of meeting.outcome.actions.filter(hasText)) {
    const citation = action.citations[0];
    push("action", action.text, {
      owner: action.owner ?? "",
      due: action.dueDate ?? "",
      status: action.status,
      confidence: action.confidence.toFixed(2),
      citation: citationLabel(citation),
      speaker: citation?.speaker ?? "",
    });
  }
  for (const item of meeting.outcome.questions) {
    const citation = item.citations[0];
    push("question", item.text, { citation: citationLabel(citation), speaker: citation?.speaker ?? "" });
  }
  for (const item of meeting.outcome.risks) {
    const citation = item.citations[0];
    push("risk", item.text, { citation: citationLabel(citation), speaker: citation?.speaker ?? "" });
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

export function toIcs(meeting: Meeting, stamp = "20260101T000000Z"): string {
  const events = meeting.outcome.actions.filter(hasText).filter((action) => action.dueDate && action.status !== "dropped");
  const body = events.map((action) => event(meeting, action, stamp)).join("");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Quorum//Meeting Actions//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n${body}END:VCALENDAR\r\n`;
}

export function downloadName(meeting: Meeting, extension: string): string {
  return `${slugify(meeting.title)}.${extension}`;
}

function event(meeting: Meeting, action: ActionItem, stamp: string): string {
  const due = action.dueDate?.replaceAll("-", "") ?? "";
  const end = shift(action.dueDate ?? meeting.date);
  const citation = action.citations[0];
  const when = citation?.startMs != null ? formatTimestamp(citation.startMs) : citation ? `line ${citation.line}` : "uncited";
  const description = `From ${meeting.title} (${meeting.date}). Cited at ${when}. ${citation?.quote ?? ""}`;
  const summary = `${action.owner ? `${action.owner}: ` : ""}${action.text}`;
  const uid = `${stableId("ics", meeting.id, action.id)}@quorum.local`;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${due}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
  ]
    .map(fold)
    .join("\r\n")
    .concat("\r\n");
}

function shift(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + 1);
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}${nextMonth}${nextDay}`;
}

function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts = [line.slice(0, 73)];
  for (let index = 73; index < line.length; index += 72) parts.push(` ${line.slice(index, index + 72)}`);
  return parts.join("\r\n");
}

function escapeIcs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function hasText(action: ActionItem): boolean {
  return action.text.trim().length > 0;
}

function cite(citation: { startMs: number | null; line: number; speaker: string } | undefined): string {
  if (!citation) return "";
  const when = citation.startMs != null ? formatTimestamp(citation.startMs) : `line ${citation.line}`;
  return `_(${when}, ${citation.speaker})_`;
}

function citationLabel(citation: { startMs: number | null; line: number } | undefined): string {
  if (!citation) return "";
  return citation.startMs != null ? formatTimestamp(citation.startMs) : `line ${citation.line}`;
}

function listOrNone(lines: string[]): string[] {
  return lines.length > 0 ? lines : ["- None recorded."];
}

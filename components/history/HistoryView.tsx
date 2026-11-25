"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMeetings } from "@/components/providers/MeetingProvider";
import { formatDisplayDate, formatLongDate } from "@/lib/dates";
import { isOverdue, openActions, statusLabel } from "@/lib/meeting";
import type { ActionStatus } from "@/lib/types";

type Filter = "open" | "in_progress" | "overdue" | "done" | "all";

export function HistoryView() {
  const { ready, today, meetings, updateMeeting, restore } = useMeetings();
  const [filter, setFilter] = useState<Filter>("open");
  const [owner, setOwner] = useState("all");
  const owners = useMemo(
    () => [...new Set(meetings.flatMap((meeting) => meeting.outcome.actions.map((action) => action.owner).filter(Boolean) as string[]))].sort(),
    [meetings],
  );

  if (!ready) return <p role="status">Loading records…</p>;

  const rows = meetings.flatMap((meeting) =>
    meeting.outcome.actions
      .filter((action) => action.text.trim())
      .map((action) => ({ meeting, action })),
  );
  const visible = rows.filter(({ action }) => {
    if (owner !== "all" && action.owner !== owner) return false;
    if (filter === "all") return true;
    if (filter === "overdue") return isOverdue(action.dueDate, action.status, today);
    if (filter === "open") return action.status === "open" || action.status === "in_progress";
    return action.status === filter;
  });

  return (
    <div className="q-history">
      <header className="q-hero">
        <p className="q-kicker">History</p>
        <h1 className="q-display">Open work, across meetings.</h1>
        <p className="q-lede">
          Status lives with the meeting that created it. Change it here or on the record. Nothing is synced to a server.
        </p>
      </header>
      <section aria-labelledby="open-heading">
        <div className="q-record-head">
          <h2 id="open-heading">Open commitments</h2>
          <button type="button" className="q-btn q-btn--ghost" onClick={restore}>
            Restore sample records
          </button>
        </div>
        <div className="q-filters">
          {(
            [
              ["open", "Open"],
              ["in_progress", "In progress"],
              ["overdue", "Overdue"],
              ["done", "Done"],
              ["all", "All"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="q-btn q-btn--ghost"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
          <label className="q-field">
            <span>Owner</span>
            <select value={owner} onChange={(event) => setOwner(event.target.value)}>
              <option value="all">All owners</option>
              {owners.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {visible.length === 0 ? <p>Nothing in this filter.</p> : null}
        <div className="q-samples" style={{ marginTop: "0.8rem" }}>
          {visible.map(({ meeting, action }) => (
            <article key={action.id} className="q-card q-commit">
              <label>
                <span className="q-sr">Status for {action.text}</span>
                <select
                  value={action.status}
                  onChange={(event) => {
                    const status = event.target.value as ActionStatus;
                    updateMeeting({
                      ...meeting,
                      outcome: {
                        ...meeting.outcome,
                        actions: meeting.outcome.actions.map((item) => (item.id === action.id ? { ...item, status } : item)),
                      },
                    });
                  }}
                >
                  {Object.entries(statusLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <h3>
                  <Link href={`/meetings/${meeting.id}#action-${action.id}`}>{action.text}</Link>
                </h3>
                <p>
                  {action.owner ?? "Unassigned"}
                  {action.dueDate ? ` · ${formatLongDate(action.dueDate)}` : ""} · {meeting.title}
                  {isOverdue(action.dueDate, action.status, today) ? " · Overdue" : ""}
                </p>
              </div>
              <Link className="q-btn q-btn--ghost" href={`/meetings/${meeting.id}`}>
                Open {meeting.title}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="q-meetings" aria-labelledby="meetings-heading">
        <h2 id="meetings-heading">Meetings</h2>
        {meetings.map((meeting) => {
          const open = openActions([meeting]).length;
          return (
            <Link key={meeting.id} className="q-card q-meeting" href={`/meetings/${meeting.id}`}>
              <div>
                <span className="q-index">{formatDisplayDate(meeting.date)}</span>
                <h3>{meeting.title}</h3>
                <p className="q-note">
                  {meeting.attendees.join(", ") || "Speakers not named"} · {meeting.outcome.actions.length} actions · {open}{" "}
                  still open
                </p>
              </div>
              <span className="q-note">{meeting.sample ? "Sample" : "Yours"}</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

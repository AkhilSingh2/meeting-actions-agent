"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDisplayDate, formatLongDate, formatTimestamp } from "@/lib/dates";
import { confidenceBand, draftEmail } from "@/lib/extract/heuristic";
import { randomId } from "@/lib/id";
import { isOverdue, statusLabel } from "@/lib/meeting";
import type { ActionItem, ActionStatus, Citation, ExtractedNote, Meeting } from "@/lib/types";
import { ExportDialog } from "@/components/review/ExportDialog";
import { TranscriptPane } from "@/components/review/TranscriptPane";

export function ReviewBoard({
  meeting,
  today,
  onChange,
  onRemove,
}: {
  meeting: Meeting;
  today: string;
  onChange: (meeting: Meeting) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { outcome } = meeting;

  function patch(next: Meeting["outcome"]) {
    onChange({ ...meeting, outcome: next });
  }

  function cite(citation: Citation) {
    setActiveId(citation.cueId);
    setActiveQuote(citation.quote);
    const node = document.getElementById(`cue-${citation.cueId}`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    node?.focus();
  }

  function updateAction(id: string, partial: Partial<ActionItem>) {
    patch({
      ...outcome,
      actions: outcome.actions.map((action) => (action.id === id ? { ...action, ...partial } : action)),
    });
  }

  return (
    <div>
      <header className="q-record-head">
        <div>
          <Link className="q-back" href="/history">
            All meetings
          </Link>
          {editing ? (
            <label className="q-field">
              <span>Title</span>
              <input value={meeting.title} onChange={(event) => onChange({ ...meeting, title: event.target.value })} />
            </label>
          ) : (
            <h1>{meeting.title}</h1>
          )}
          <p className="q-meta">
            {formatDisplayDate(meeting.date)} · {meeting.attendees.join(", ") || "Speakers not named"} ·{" "}
            {meeting.sourceLabel} · {outcome.engine === "llm" ? outcome.model : "Heuristic"}
          </p>
        </div>
        <div className="q-row">
          <button
            type="button"
            className="q-btn q-btn--ghost"
            aria-pressed={editing}
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "Done editing" : "Edit record"}
          </button>
          <button type="button" className="q-btn q-btn--primary" onClick={() => setExporting(true)}>
            Export
          </button>
        </div>
      </header>
      {outcome.warnings.length > 0 ? (
        <div>
          {outcome.warnings.map((warning) => (
            <p key={warning} className="q-warn" role="status">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
      <div className="q-review">
        <TranscriptPane cues={meeting.cues} activeId={activeId} activeQuote={activeQuote} />
        <div className="q-card q-board">
          <nav className="q-anchor" aria-label="Record sections">
            <a href="#summary">01 Summary</a>
            <a href="#decisions">02 Decisions</a>
            <a href="#actions">03 Actions</a>
            <a href="#questions">04 Questions</a>
            <a href="#risks">05 Risks</a>
            <a href="#email">06 Follow-up</a>
          </nav>
          <section id="summary" className="q-section q-rise">
            <p className="q-index">01</p>
            <h2>Summary</h2>
            {editing ? (
              <label className="q-field">
                <span>Summary</span>
                <textarea value={outcome.summary} onChange={(event) => patch({ ...outcome, summary: event.target.value })} />
              </label>
            ) : (
              <p>{outcome.summary}</p>
            )}
            <p className="q-note">The summary is stitched from the transcript. It is not a paraphrase from a model unless live mode is on, and even then the email below is rendered from the fields.</p>
          </section>
          <NoteSection
            id="decisions"
            index="02"
            title="Decisions"
            items={outcome.decisions}
            editing={editing}
            onCite={cite}
            onChange={(items) => patch({ ...outcome, decisions: items })}
            onAdd={() => patch({ ...outcome, decisions: [...outcome.decisions, blank("dec")] })}
          />
          <section id="actions" className="q-section q-rise" aria-labelledby="actions-heading">
            <p className="q-index">03</p>
            <h2 id="actions-heading">Actions</h2>
            <p className="q-note">Confidence is a rule score, not a measured probability. Status is tracked across meetings in this browser.</p>
            {outcome.actions.length === 0 ? <p>No action items yet.</p> : null}
            <ol className="q-list">
              {outcome.actions.map((action) => (
                <li key={action.id}>
                  <article className="q-item" id={`action-${action.id}`} aria-labelledby={`action-${action.id}-title`}>
                    <div className="q-item__top">
                      {editing ? (
                        <label className="q-inline">
                          <span>Action</span>
                          <input
                            value={action.text}
                            onChange={(event) => updateAction(action.id, { text: event.target.value })}
                          />
                        </label>
                      ) : (
                        <p id={`action-${action.id}-title`}>{action.text}</p>
                      )}
                      <label>
                        <span className="q-sr">Status for {action.text || "untitled action"}</span>
                        <select
                          value={action.status}
                          onChange={(event) => updateAction(action.id, { status: event.target.value as ActionStatus })}
                        >
                          {Object.entries(statusLabel).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="q-item__meta">
                      {editing ? (
                        <>
                          <label className="q-inline">
                            <span>Owner for {action.text || "untitled action"}</span>
                            <input
                              value={action.owner ?? ""}
                              onChange={(event) => updateAction(action.id, { owner: event.target.value || null })}
                            />
                          </label>
                          <label className="q-inline">
                            <span>Due date for {action.text || "untitled action"}</span>
                            <input
                              type="date"
                              value={action.dueDate ?? ""}
                              onChange={(event) => updateAction(action.id, { dueDate: event.target.value || null })}
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <span>{action.owner ?? "Unassigned"}</span>
                          <span>{action.dueDate ? formatLongDate(action.dueDate) : "No date"}</span>
                        </>
                      )}
                      {isOverdue(action.dueDate, action.status, today) ? <span className="q-overdue">Overdue</span> : null}
                      <Meter value={action.confidence} />
                      {action.citations[0] ? (
                        <CitationLink citation={action.citations[0]} onCite={cite} />
                      ) : (
                        <span className="q-note">No citation</span>
                      )}
                      {action.citations[0] && action.owner && action.owner !== action.citations[0].speaker ? (
                        <span className="q-note">Said by {action.citations[0].speaker}</span>
                      ) : null}
                    </div>
                    {editing ? (
                      <button type="button" className="q-btn q-btn--danger" onClick={() => patch({ ...outcome, actions: outcome.actions.filter((item) => item.id !== action.id) })}>
                        Remove {action.text || "action"}
                      </button>
                    ) : null}
                  </article>
                </li>
              ))}
            </ol>
            {editing ? (
              <button
                type="button"
                className="q-btn q-btn--ghost"
                onClick={() =>
                  patch({
                    ...outcome,
                    actions: [
                      ...outcome.actions,
                      {
                        id: randomId("act"),
                        text: "",
                        owner: null,
                        dueDate: null,
                        confidence: 0.5,
                        status: "open",
                        citations: [],
                      },
                    ],
                  })
                }
              >
                Add action
              </button>
            ) : null}
          </section>
          <NoteSection
            id="questions"
            index="04"
            title="Open questions"
            items={outcome.questions}
            editing={editing}
            onCite={cite}
            onChange={(items) => patch({ ...outcome, questions: items })}
            onAdd={() => patch({ ...outcome, questions: [...outcome.questions, blank("q")] })}
          />
          <NoteSection
            id="risks"
            index="05"
            title="Risks"
            items={outcome.risks}
            editing={editing}
            onCite={cite}
            onChange={(items) => patch({ ...outcome, risks: items })}
            onAdd={() => patch({ ...outcome, risks: [...outcome.risks, blank("risk")] })}
          />
          <section id="email" className="q-section">
            <p className="q-index">06</p>
            <h2>Follow-up</h2>
            {editing ? (
              <>
                <label className="q-field">
                  <span>Subject</span>
                  <input
                    value={outcome.email.subject}
                    onChange={(event) => patch({ ...outcome, email: { ...outcome.email, subject: event.target.value } })}
                  />
                </label>
                <label className="q-field">
                  <span>Email</span>
                  <textarea
                    value={outcome.email.body}
                    onChange={(event) => patch({ ...outcome, email: { ...outcome.email, body: event.target.value } })}
                  />
                </label>
              </>
            ) : (
              <>
                <p className="q-note">{outcome.email.subject}</p>
                <p className="q-email">{outcome.email.body}</p>
              </>
            )}
            <div className="q-row">
              <button
                type="button"
                className="q-btn q-btn--ghost"
                onClick={() => void navigator.clipboard.writeText(`Subject: ${outcome.email.subject}\n\n${outcome.email.body}`)}
              >
                Copy follow-up
              </button>
              <button
                type="button"
                className="q-btn q-btn--ghost"
                onClick={() =>
                  patch({
                    ...outcome,
                    email: draftEmail({
                      title: meeting.title,
                      date: meeting.date,
                      summary: outcome.summary,
                      decisions: outcome.decisions,
                      actions: outcome.actions,
                      questions: outcome.questions,
                      risks: outcome.risks,
                    }),
                  })
                }
              >
                Rebuild follow-up
              </button>
            </div>
          </section>
          <section className="q-section">
            {confirming ? (
              <button type="button" className="q-btn q-btn--danger" onClick={onRemove}>
                Confirm remove
              </button>
            ) : (
              <button type="button" className="q-btn q-btn--ghost" onClick={() => setConfirming(true)}>
                Remove this record
              </button>
            )}
          </section>
        </div>
      </div>
      {exporting ? <ExportDialog meeting={meeting} onClose={() => setExporting(false)} /> : null}
    </div>
  );
}

function NoteSection({
  id,
  index,
  title,
  items,
  editing,
  onCite,
  onChange,
  onAdd,
}: {
  id: string;
  index: string;
  title: string;
  items: ExtractedNote[];
  editing: boolean;
  onCite: (citation: Citation) => void;
  onChange: (items: ExtractedNote[]) => void;
  onAdd: () => void;
}) {
  return (
    <section id={id} className="q-section q-rise">
      <p className="q-index">{index}</p>
      <h2>{title}</h2>
      {items.length === 0 ? <p>None recorded.</p> : null}
      <ul className="q-list">
        {items.map((item) => (
          <li key={item.id} className="q-item">
            {editing ? (
              <label className="q-field">
                <span>{title}</span>
                <textarea
                  value={item.text}
                  onChange={(event) =>
                    onChange(items.map((note) => (note.id === item.id ? { ...note, text: event.target.value } : note)))
                  }
                />
              </label>
            ) : (
              <p>{item.text}</p>
            )}
            <div className="q-row">
              {item.citations[0] ? <CitationLink citation={item.citations[0]} onCite={onCite} /> : <span className="q-note">No citation</span>}
              {editing ? (
                <button type="button" className="q-btn q-btn--danger" onClick={() => onChange(items.filter((note) => note.id !== item.id))}>
                  Remove
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {editing ? (
        <button type="button" className="q-btn q-btn--ghost" onClick={onAdd}>
          Add
        </button>
      ) : null}
    </section>
  );
}

function CitationLink({ citation, onCite }: { citation: Citation; onCite: (citation: Citation) => void }) {
  const stamp = citation.startMs != null ? formatTimestamp(citation.startMs) : `L${citation.line}`;
  return (
    <a
      className="q-cite"
      href={`#cue-${citation.cueId}`}
      aria-label={`${stamp}, line ${citation.line}, ${citation.speaker}`}
      onClick={(event) => {
        event.preventDefault();
        onCite(citation);
      }}
    >
      <span aria-hidden="true">{stamp}</span>
    </a>
  );
}

function Meter({ value }: { value: number }) {
  const band = confidenceBand(value);
  const label = band === "high" ? "High" : band === "medium" ? "Medium" : "Low";
  return (
    <span className="q-meter" data-band={band}>
      {label} {value.toFixed(2)}
      <span className="q-meter__bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

function blank(prefix: string): ExtractedNote {
  return { id: randomId(prefix), text: "", citations: [] };
}

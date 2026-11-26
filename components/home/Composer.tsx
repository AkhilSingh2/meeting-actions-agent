"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMeetings } from "@/components/providers/MeetingProvider";
import { todayISO } from "@/lib/dates";
import { sampleMeta } from "@/lib/samples/transcripts";
import type { EngineRequest, Meeting } from "@/lib/types";
import { meetingHref } from "@/lib/demo/static-demo";

type Status = {
  demoMode: boolean;
  llm: { configured: boolean; reason: string | null; provider: string };
};

export function Composer() {
  const router = useRouter();
  const { saveMeeting } = useMeetings();
  const [title, setTitle] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [engine, setEngine] = useState<EngineRequest>("heuristic");
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    if (dateRef.current && !dateRef.current.value) dateRef.current.value = todayISO();
  }, []);

  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json())
      .then((payload: Status) => setStatus(payload))
      .catch(() => setStatus(null));
  }, []);

  const liveDisabled = !status?.llm.configured;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    setMessage("Reading the transcript.");
    try {
      const response = file
        ? await fetch("/api/extract", { method: "POST", body: formData() })
        : await fetch("/api/extract", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text, filename, title, meetingDate: dateRef.current?.value ?? "", engine }),
          });
      const payload = (await response.json()) as { meeting?: Meeting; error?: string };
      if (!response.ok || !payload.meeting) throw new Error(payload.error || "Extraction failed.");
      saveMeeting(payload.meeting);
      const count = payload.meeting.outcome.actions.length;
      setMessage(`Record ready. ${count} action ${count === 1 ? "item" : "items"}.`);
      router.push(meetingHref(payload.meeting.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Extraction failed.");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  function formData() {
    const data = new FormData();
    if (file) data.set("file", file);
    data.set("title", title);
    data.set("meetingDate", dateRef.current?.value ?? "");
    data.set("engine", engine);
    return data;
  }

  function takeFile(next: File) {
    if (next.size > 2_000_000) {
      setError("That file is larger than 2 MB.");
      return;
    }
    setError("");
    setFile(next);
    setFilename(next.name);
    if (!title) setTitle(next.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    if (next.name.toLowerCase().endsWith(".docx")) {
      setText("");
      return;
    }
    void next.text().then((value) => {
      setText(value);
      setFile(null);
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <>
      <header className="q-hero">
        <p className="q-kicker">Meeting agent</p>
        <h1 className="q-display">The meeting, accounted for.</h1>
        <p className="q-lede">
          Paste a transcript or drop a Zoom, Meet, or Teams export. Quorum returns the decisions, the owners, and a
          follow-up. Every item cites the line it came from.
        </p>
        <p className="q-badge">
          <i />
          {status?.demoMode === false ? `Live · ${status.llm.provider}` : "Demo · heuristic · stays in this browser"}
        </p>
      </header>
      <div className="q-home">
        <form className="q-card q-card__body q-form" onSubmit={onSubmit}>
          <div className="q-split">
            <label className="q-field">
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="q-field">
              <span>Meeting date</span>
              <input ref={dateRef} type="date" required name="meetingDate" />
            </label>
          </div>
          <label className="q-field">
            <span>Transcript</span>
            <textarea
              className="q-source"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setFile(null);
              }}
              onKeyDown={onKeyDown}
              placeholder="e.g. Mina Cole: I'll send the checklist by Friday."
              aria-describedby="transcript-hint"
            />
          </label>
          <p id="transcript-hint" className="q-note">
            Speaker lines, WebVTT, SubRip, or a Zoom text export. Press Ctrl+Enter or Cmd+Enter to extract.
          </p>
          <div
            className="q-drop"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const next = event.dataTransfer.files[0];
              if (next) takeFile(next);
            }}
          >
            <label className="q-field">
              <span>Upload transcript</span>
              <input
                type="file"
                accept=".vtt,.srt,.txt,.docx,text/vtt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const next = event.target.files?.[0];
                  if (next) takeFile(next);
                }}
              />
            </label>
            <p className="q-note">{file ? file.name : "Or drop a .vtt, .srt, .txt, or .docx file."}</p>
          </div>
          <fieldset className="q-choices" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="q-label">Engine</legend>
            <label className="q-choice">
              <input
                type="radio"
                name="engine"
                value="heuristic"
                checked={engine === "heuristic"}
                onChange={() => setEngine("heuristic")}
              />
              Heuristic
            </label>
            <label className="q-choice">
              <input
                type="radio"
                name="engine"
                value="llm"
                checked={engine === "llm"}
                disabled={liveDisabled}
                onChange={() => setEngine("llm")}
              />
              Live model
            </label>
          </fieldset>
          {liveDisabled ? (
            <p className="q-note">{status?.llm.reason ?? "Checking whether a live model is configured."}</p>
          ) : null}
          {error ? (
            <p className="q-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="q-row">
            <button className="q-btn q-btn--primary" type="submit" disabled={busy || (!text.trim() && !file)}>
              {busy ? "Extracting…" : "Extract outcomes"}
            </button>
          </div>
          <p className="q-sr" aria-live="polite">
            {message}
          </p>
        </form>
        <aside className="q-samples" aria-labelledby="samples-heading">
          <h2 id="samples-heading" className="q-kicker">
            Sample records
          </h2>
          {sampleMeta.map((sample, index) => (
            <article key={sample.id} className="q-card q-sample">
              <span className="q-index">0{index + 1}</span>
              <h2>{sample.title}</h2>
              <p>{sample.blurb}</p>
              <div className="q-row">
                <Link className="q-btn q-btn--ghost" href={meetingHref(sample.id)}>
                  Open {sample.title}
                </Link>
                <button
                  type="button"
                  className="q-btn q-btn--ghost"
                  onClick={() => {
                    setTitle(sample.title);
                    setText(sample.transcript);
                    setFilename("");
                    setFile(null);
                    setMessage(`${sample.title} is in the editor.`);
                  }}
                >
                  Load in editor
                </button>
              </div>
            </article>
          ))}
        </aside>
      </div>
    </>
  );
}

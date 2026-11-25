"use client";

import { useEffect, useRef, useState } from "react";
import { downloadName, toCsv, toIcs, toMarkdown } from "@/lib/export/files";
import type { ExportTarget, Meeting } from "@/lib/types";

const targets: Array<{ id: ExportTarget; label: string; file?: boolean }> = [
  { id: "markdown", label: "Markdown", file: true },
  { id: "csv", label: "CSV", file: true },
  { id: "ics", label: "Calendar", file: true },
  { id: "jira", label: "Jira" },
  { id: "linear", label: "Linear" },
  { id: "github", label: "GitHub Issues" },
  { id: "notion", label: "Notion" },
  { id: "slack", label: "Slack" },
];

type PlanResponse = {
  mode: "dry-run" | "live";
  reason?: string;
  plan: { requests: Array<{ method: string; url: string; headers: Record<string, string>; body: unknown }>; missing: string[]; note: string };
  results: Array<{ ok: boolean; status: number; detail: string }>;
  error?: string;
};

export function ExportDialog({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<ExportTarget>("markdown");
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const current = targets.find((item) => item.id === target);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  useEffect(() => {
    if (current?.file) return;
    const controller = new AbortController();
    fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target, meeting, deliver: false }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload: PlanResponse) => {
        if (!controller.signal.aborted) setPlan(payload);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlan(null);
      });
    return () => controller.abort();
  }, [target, meeting, current?.file]);

  function fileText(): string {
    if (target === "markdown") return toMarkdown(meeting);
    if (target === "csv") return toCsv(meeting);
    return toIcs(meeting);
  }

  function download() {
    const content = fileText();
    const extension = target === "markdown" ? "md" : target === "csv" ? "csv" : "ics";
    const type = target === "csv" ? "text/csv" : target === "ics" ? "text/calendar" : "text/markdown";
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadName(meeting, extension);
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${anchor.download}.`);
  }

  async function copyPreview() {
    const text = current?.file ? fileText() : JSON.stringify(plan?.plan.requests[index] ?? plan?.plan, null, 2);
    await navigator.clipboard.writeText(text);
    setMessage("Copied the preview.");
  }

  async function send() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target, meeting, deliver: true }),
      });
      const payload = (await response.json()) as PlanResponse;
      setPlan(payload);
      if (payload.error) setMessage(payload.error);
      else if (payload.mode === "live") {
        const ok = payload.results.filter((result) => result.ok).length;
        setMessage(`Sent ${ok} of ${payload.results.length}.`);
      } else setMessage(payload.reason ?? "Preview only.");
    } finally {
      setBusy(false);
    }
  }

  const request = plan?.plan.requests[index];
  const preview = current?.file ? fileText() : request ? `${request.method} ${request.url}\n\n${JSON.stringify({ headers: request.headers, body: request.body }, null, 2)}` : "Building the preview…";

  return (
    <dialog
      ref={dialogRef}
      className="q-dialog"
      aria-labelledby="export-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
    >
      <form method="dialog" className="q-dialog__body">
        <div className="q-item__top">
          <h2 id="export-title">Export</h2>
          <button className="q-btn q-btn--ghost" type="submit" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="q-note">
          File downloads stay on this machine. Ticket previews are dry runs until demo mode is off and credentials are
          set.
        </p>
        <div className="q-target-grid" role="radiogroup" aria-label="Export target">
          {targets.map((item) => (
            <label key={item.id} className="q-choice">
              <input
                type="radio"
                name="target"
                value={item.id}
                checked={target === item.id}
                onChange={() => {
                  setTarget(item.id);
                  setIndex(0);
                  setMessage("");
                  setPlan(null);
                }}
              />
              {item.label}
            </label>
          ))}
        </div>
        {plan && !current?.file ? (
          <p className="q-note">
            {plan.reason ?? plan.plan.note}
            {plan.plan.missing.length ? ` Missing ${plan.plan.missing.join(", ")}.` : ""}
            {plan.plan.requests.length > 1 ? ` ${plan.plan.requests.length} requests, one per action.` : ""}
          </p>
        ) : null}
        {plan && plan.plan.requests.length > 1 ? (
          <label className="q-field">
            <span>Request</span>
            <select value={index} onChange={(event) => setIndex(Number(event.target.value))}>
              {plan.plan.requests.map((item, itemIndex) => (
                <option key={item.url + itemIndex} value={itemIndex}>
                  {itemIndex + 1}. {item.method} {item.url}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <pre className="q-pre" aria-label="Request preview">
          {preview}
        </pre>
        <div className="q-row">
          {current?.file ? (
            <button className="q-btn q-btn--primary" type="button" onClick={download}>
              Download {current.label}
            </button>
          ) : (
            <button className="q-btn q-btn--primary" type="button" onClick={() => void send()} disabled={busy}>
              {busy ? "Sending…" : "Send live"}
            </button>
          )}
          <button className="q-btn q-btn--ghost" type="button" onClick={() => void copyPreview()}>
            Copy preview
          </button>
        </div>
        <p className="q-sr" aria-live="polite">
          {message}
        </p>
        {message ? <p className="q-note">{message}</p> : null}
      </form>
    </dialog>
  );
}

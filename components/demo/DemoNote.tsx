"use client";

import { installStaticApi } from "@/lib/demo/static-api";
import { STATIC_DEMO } from "@/lib/demo/static-demo";

installStaticApi();

/** Small fixed note on the hosted demo so it is never mistaken for a live deployment. */
export function DemoNote() {
  if (!STATIC_DEMO) return null;
  return (
    <div
      role="note"
      data-testid="demo-note"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 60,
        maxWidth: "calc(100vw - 32px)",
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid var(--line)",
        background: "var(--surface)",
        color: "var(--muted)",
        font: "500 12px/1.3 var(--sans, sans-serif)",
        pointerEvents: "none",
      }}
    >
      Demo mode · sample transcripts, running in your browser
    </div>
  );
}

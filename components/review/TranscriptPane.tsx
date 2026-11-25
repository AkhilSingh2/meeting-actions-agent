import { formatTimestamp } from "@/lib/dates";
import type { TranscriptCue } from "@/lib/types";

export function TranscriptPane({
  cues,
  activeId,
  activeQuote,
}: {
  cues: TranscriptCue[];
  activeId: string | null;
  activeQuote: string | null;
}) {
  return (
    <aside className="q-card q-transcript" aria-label="Transcript" tabIndex={0}>
      <div className="q-pane-head">
        <h2>Transcript</h2>
        <span className="q-note">
          {cues.length} {cues.length === 1 ? "line" : "lines"}
        </span>
      </div>
      {cues.map((cue) => (
        <article
          key={cue.id}
          id={`cue-${cue.id}`}
          tabIndex={-1}
          className={cue.id === activeId ? "q-cue q-cue--active" : "q-cue"}
        >
          <div className="q-cue__who">
            <span className="q-time">{cue.startMs != null ? formatTimestamp(cue.startMs) : `L${cue.line}`}</span>
            <span className="q-who">{cue.speaker}</span>
          </div>
          <p>{renderText(cue.text, cue.id === activeId ? activeQuote : null)}</p>
        </article>
      ))}
    </aside>
  );
}

function renderText(text: string, quote: string | null) {
  if (!quote) return text;
  const index = text.indexOf(quote);
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{quote}</mark>
      {text.slice(index + quote.length)}
    </>
  );
}

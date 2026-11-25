import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Guide" };

const steps = [
  {
    index: "01",
    title: "Normalize",
    body: "WebVTT, SubRip, Zoom text, Meet text, speaker dialogue, and Word documents become cues: speaker, time, line number, words.",
  },
  {
    index: "02",
    title: "Attribute",
    body: "“I’ll send the checklist” belongs to the person who said it. “Sam, can you…” belongs to Sam, and the cue still remembers who asked.",
  },
  {
    index: "03",
    title: "Classify",
    body: "A sentence is a decision, an action, a question, a risk, or nothing. Small talk and “I’ll be right there” fall through.",
  },
  {
    index: "04",
    title: "Fill the slots",
    body: "Owner, due date, and a rule score. “By Friday” is the Friday of the meeting’s week, including today. The score is a rule, not a probability.",
  },
  {
    index: "05",
    title: "Cite",
    body: "Each item keeps the cue id, the line, and the sentence. The review board scrolls to that line. If a model cites an id that does not exist, the citation is dropped and the score falls.",
  },
  {
    index: "06",
    title: "Render, then review",
    body: "The summary quotes the source. The follow-up email is a template over the fields, so you can edit the fields and rebuild it. Export comes after the review.",
  },
];

export default function GuidePage() {
  return (
    <div>
      <header className="q-hero">
        <p className="q-kicker">Guide</p>
        <h1 className="q-display">A small agent, with the steps showing.</h1>
        <p className="q-lede">
          Quorum is a pipeline with one optional model call. Demo mode never takes that call. The study guide in{" "}
          <code>docs/LEARNING.md</code> walks the same path with exercises.
        </p>
      </header>
      <div className="q-steps">
        {steps.map((step) => (
          <article key={step.index} className="q-card q-step">
            <span className="q-index">{step.index}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </div>
          </article>
        ))}
      </div>
      <section className="q-card q-card__body" style={{ marginTop: "1rem" }}>
        <h2>One sentence</h2>
        <p className="q-email">“I’ll ship the feature flag for the short flow by Friday.”</p>
        <p>
          Speaker Sam Okonkwo, so the owner is Sam. “Ship” is a deliverable verb. “By Friday” resolves against the
          meeting date. The cue id is the citation. Confidence goes up because there is an owner and a date. “We decided
          to drop the product tour” never becomes an action: the decision pattern wins when nobody is being assigned.
        </p>
        <p>
          <Link href="/meetings/northline-critique">Open the Northline record</Link> to see the same sentence in the
          board.
        </p>
      </section>
    </div>
  );
}

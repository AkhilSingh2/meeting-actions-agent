import type { Metadata } from "next";
import { runEval } from "@/lib/evals/run";

export const metadata: Metadata = { title: "Evals" };

export default function EvalsPage() {
  const report = runEval();
  return (
    <div>
      <header className="q-hero">
        <p className="q-kicker">Evals</p>
        <h1 className="q-display">What the heuristic catches.</h1>
        <p className="q-lede">
          Six short transcripts live in the repo. Five are explicit. One hides a commitment inside “needs a timeout
          budget from Leah,” which this extractor is not expected to catch. Scores are micro-averaged. Owner and due
          date are scored only on actions that matched.
        </p>
      </header>
      <div className="q-card q-card__body">
        <div className="q-table-wrap">
          <table>
            <caption className="q-sr">Precision, recall, and F1 by case and outcome type</caption>
            <thead>
              <tr>
                <th scope="col">Case</th>
                <th scope="col">Actions</th>
                <th scope="col">Decisions</th>
                <th scope="col">Questions</th>
                <th scope="col">Risks</th>
                <th scope="col">Owner</th>
                <th scope="col">Due</th>
              </tr>
            </thead>
            <tbody>
              {report.cases.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.title}</th>
                  <td>{triple(item.actions)}</td>
                  <td>{triple(item.decisions)}</td>
                  <td>{triple(item.questions)}</td>
                  <td>{triple(item.risks)}</td>
                  <td>{pct(item.ownerAccuracy)}</td>
                  <td>{pct(item.dueAccuracy)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">All cases</th>
                <td>{triple(report.aggregate.actions)}</td>
                <td>{triple(report.aggregate.decisions)}</td>
                <td>{triple(report.aggregate.questions)}</td>
                <td>{triple(report.aggregate.risks)}</td>
                <td>{pct(report.aggregate.ownerAccuracy)}</td>
                <td>{pct(report.aggregate.dueAccuracy)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="q-callout">
          <p>
            Known miss: “The design note needs a timeout budget from Leah before Monday.” A person can hear the owner
            and the date. The heuristic looks for “I will,” “Name will,” and “Name, can you,” so this line stays
            unmatched. Action recall on the full set is {pct(report.aggregate.actions.recall)} ({report.aggregate.actions.matched} of {report.aggregate.actions.gold}).
          </p>
          <p className="q-note">
            Citation accuracy on matched items is {pct(report.aggregate.citationAccuracy)}. This is a small checked-in
            set, not a claim about transcripts in general. Add a case under <code>lib/evals/gold.ts</code> and run{" "}
            <code>npm run eval</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

function pct(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function triple(score: { precision: number; recall: number; f1: number }): string {
  return `${pct(score.precision)} / ${pct(score.recall)} / ${pct(score.f1)}`;
}

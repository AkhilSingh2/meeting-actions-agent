import { runEval } from "../lib/evals/run";

const report = runEval();
const percent = (value: number | null) => (value == null ? "—" : `${(value * 100).toFixed(1)}%`);

console.log("Quorum heuristic eval");
console.log("");
console.log(
  ["case", "actions P/R/F1", "decisions P/R/F1", "questions P/R/F1", "risks P/R/F1", "owner", "due"].join("\t"),
);
for (const item of report.cases) {
  console.log(
    [
      item.id,
      triple(item.actions),
      triple(item.decisions),
      triple(item.questions),
      triple(item.risks),
      percent(item.ownerAccuracy),
      percent(item.dueAccuracy),
    ].join("\t"),
  );
  for (const miss of item.actions.misses) console.log(`  miss action: ${miss}`);
  for (const extra of item.actions.extras) console.log(`  extra action: ${extra}`);
}
console.log("");
console.log(`actions     ${triple(report.aggregate.actions)}  n=${report.aggregate.actions.gold}`);
console.log(`decisions   ${triple(report.aggregate.decisions)}  n=${report.aggregate.decisions.gold}`);
console.log(`questions   ${triple(report.aggregate.questions)}  n=${report.aggregate.questions.gold}`);
console.log(`risks       ${triple(report.aggregate.risks)}  n=${report.aggregate.risks.gold}`);
console.log(`owner       ${percent(report.aggregate.ownerAccuracy)}`);
console.log(`due date    ${percent(report.aggregate.dueAccuracy)}`);
console.log(`citations   ${percent(report.aggregate.citationAccuracy)}`);

function triple(score: { precision: number; recall: number; f1: number }): string {
  return `${percent(score.precision)} / ${percent(score.recall)} / ${percent(score.f1)}`;
}

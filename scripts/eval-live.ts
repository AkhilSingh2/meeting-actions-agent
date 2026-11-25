import { llmReadiness } from "../lib/env";
import { goldCases } from "../lib/evals/gold";
import { runEval } from "../lib/evals/run";
import { extractWithModel } from "../lib/llm/run";
import { parseTranscript } from "../lib/parse";
import { scoreClass } from "../lib/evals/score";

const readiness = llmReadiness(process.env);
if (!readiness.configured) {
  console.log(`Live eval skipped. ${readiness.reason ?? "No model is configured."}`);
  process.exit(0);
}

const heuristic = runEval();
console.log(`Heuristic action F1: ${(heuristic.aggregate.actions.f1 * 100).toFixed(1)}%`);
console.log(`Live provider: ${readiness.provider}`);

let matched = 0;
let predicted = 0;
let gold = 0;
for (const item of goldCases) {
  const parsed = parseTranscript(item.transcript, item.filename);
  const outcome = await extractWithModel(parsed, { title: item.title, meetingDate: item.meetingDate }, process.env);
  const score = scoreClass(
    outcome.actions.map((action) => ({
      text: action.text,
      owner: action.owner,
      dueDate: action.dueDate,
      quote: action.citations[0]?.quote ?? "",
    })),
    item.actions,
  );
  matched += score.matched;
  predicted += score.predicted;
  gold += score.gold;
  console.log(`${item.id}\tP ${(score.precision * 100).toFixed(0)}%\tR ${(score.recall * 100).toFixed(0)}%`);
}
const precision = predicted === 0 ? 0 : matched / predicted;
const recall = gold === 0 ? 0 : matched / gold;
const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
console.log(`Live action F1: ${(f1 * 100).toFixed(1)}% on ${gold} gold actions`);

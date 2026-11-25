import { goldCases, type GoldCase } from "@/lib/evals/gold";
import { micro, ratio, scoreClass, type ClassScore, type Prediction } from "@/lib/evals/score";
import { extractHeuristic } from "@/lib/extract/heuristic";
import { parseTranscript } from "@/lib/parse";
import type { ActionItem, ExtractedNote } from "@/lib/types";

export type CaseReport = {
  id: string;
  title: string;
  actions: ClassScore;
  decisions: ClassScore;
  questions: ClassScore;
  risks: ClassScore;
  ownerAccuracy: number | null;
  dueAccuracy: number | null;
  citationAccuracy: number | null;
};

export type EvalReport = {
  engine: "heuristic";
  cases: CaseReport[];
  aggregate: {
    actions: ClassScore;
    decisions: ClassScore;
    questions: ClassScore;
    risks: ClassScore;
    ownerAccuracy: number | null;
    dueAccuracy: number | null;
    citationAccuracy: number | null;
  };
};

export function runEval(cases: GoldCase[] = goldCases): EvalReport {
  const reports = cases.map(evaluateCase);
  const actions = micro(reports.map((report) => report.actions));
  const decisions = micro(reports.map((report) => report.decisions));
  const questions = micro(reports.map((report) => report.questions));
  const risks = micro(reports.map((report) => report.risks));
  const combined = micro([actions, decisions, questions, risks]);
  return {
    engine: "heuristic",
    cases: reports,
    aggregate: {
      actions,
      decisions,
      questions,
      risks,
      ownerAccuracy: ratio(actions.ownerMatched, actions.ownerTotal),
      dueAccuracy: ratio(actions.dueMatched, actions.dueTotal),
      citationAccuracy: ratio(combined.citationHits, combined.citationTotal),
    },
  };
}

function evaluateCase(gold: GoldCase): CaseReport {
  const parsed = parseTranscript(gold.transcript, gold.filename);
  const outcome = extractHeuristic(parsed, { title: gold.title, meetingDate: gold.meetingDate });
  const actions = scoreClass(outcome.actions.map(toPrediction), gold.actions);
  const decisions = scoreClass(outcome.decisions.map(notePrediction), gold.decisions);
  const questions = scoreClass(outcome.questions.map(notePrediction), gold.questions);
  const risks = scoreClass(outcome.risks.map(notePrediction), gold.risks);
  const combined = micro([actions, decisions, questions, risks]);
  return {
    id: gold.id,
    title: gold.title,
    actions,
    decisions,
    questions,
    risks,
    ownerAccuracy: ratio(actions.ownerMatched, actions.ownerTotal),
    dueAccuracy: ratio(actions.dueMatched, actions.dueTotal),
    citationAccuracy: ratio(combined.citationHits, combined.citationTotal),
  };
}

function toPrediction(action: ActionItem): Prediction {
  return {
    text: action.text,
    owner: action.owner,
    dueDate: action.dueDate,
    quote: action.citations[0]?.quote ?? "",
  };
}

function notePrediction(note: ExtractedNote): Prediction {
  return { text: note.text, quote: note.citations[0]?.quote ?? "" };
}

import type { GoldLabel } from "@/lib/evals/gold";

export type Prediction = {
  text: string;
  owner?: string | null;
  dueDate?: string | null;
  quote?: string;
};

export type ClassScore = {
  precision: number;
  recall: number;
  f1: number;
  predicted: number;
  gold: number;
  matched: number;
  misses: string[];
  extras: string[];
  citationHits: number;
  citationTotal: number;
  ownerMatched: number;
  ownerTotal: number;
  dueMatched: number;
  dueTotal: number;
};

export function scoreClass(predictions: Prediction[], gold: GoldLabel[]): ClassScore {
  const used = new Set<number>();
  const misses: string[] = [];
  let ownerMatched = 0;
  let ownerTotal = 0;
  let dueMatched = 0;
  let dueTotal = 0;
  let citationHits = 0;
  let citationTotal = 0;

  for (const label of gold) {
    const index = predictions.findIndex((prediction, item) => !used.has(item) && covers(prediction.text, label));
    if (index < 0) {
      misses.push(label.includes.join(" · "));
      continue;
    }
    used.add(index);
    const prediction = predictions[index];
    if (!prediction) continue;
    if (label.owner !== undefined) {
      ownerTotal += 1;
      if (ownersMatch(prediction.owner ?? null, label.owner)) ownerMatched += 1;
    }
    if (label.dueDate !== undefined) {
      dueTotal += 1;
      if ((prediction.dueDate ?? null) === label.dueDate) dueMatched += 1;
    }
    if (prediction.quote) {
      citationTotal += 1;
      if (covers(prediction.quote, label)) citationHits += 1;
    }
  }

  const matched = used.size;
  const extras = predictions.filter((_, index) => !used.has(index)).map((prediction) => prediction.text);
  const precision = predictions.length === 0 ? (gold.length === 0 ? 1 : 0) : matched / predictions.length;
  const recall = gold.length === 0 ? 1 : matched / gold.length;
  return {
    precision,
    recall,
    f1: f1(precision, recall),
    predicted: predictions.length,
    gold: gold.length,
    matched,
    misses,
    extras,
    citationHits,
    citationTotal,
    ownerMatched,
    ownerTotal,
    dueMatched,
    dueTotal,
  };
}

export function f1(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export function micro(parts: ClassScore[]): ClassScore {
  const predicted = parts.reduce((sum, part) => sum + part.predicted, 0);
  const gold = parts.reduce((sum, part) => sum + part.gold, 0);
  const matched = parts.reduce((sum, part) => sum + part.matched, 0);
  const precision = predicted === 0 ? (gold === 0 ? 1 : 0) : matched / predicted;
  const recall = gold === 0 ? 1 : matched / gold;
  return {
    precision,
    recall,
    f1: f1(precision, recall),
    predicted,
    gold,
    matched,
    misses: parts.flatMap((part) => part.misses),
    extras: parts.flatMap((part) => part.extras),
    citationHits: parts.reduce((sum, part) => sum + part.citationHits, 0),
    citationTotal: parts.reduce((sum, part) => sum + part.citationTotal, 0),
    ownerMatched: parts.reduce((sum, part) => sum + part.ownerMatched, 0),
    ownerTotal: parts.reduce((sum, part) => sum + part.ownerTotal, 0),
    dueMatched: parts.reduce((sum, part) => sum + part.dueMatched, 0),
    dueTotal: parts.reduce((sum, part) => sum + part.dueTotal, 0),
  };
}

function covers(text: string, label: GoldLabel): boolean {
  const lower = text.toLowerCase();
  return label.includes.every((part) => lower.includes(part.toLowerCase()));
}

function ownersMatch(actual: string | null, expected: string | null): boolean {
  if (expected == null) return actual == null;
  if (actual == null) return false;
  return actual.toLowerCase().includes(expected.toLowerCase());
}

export function ratio(matched: number, total: number): number | null {
  if (total === 0) return null;
  return matched / total;
}

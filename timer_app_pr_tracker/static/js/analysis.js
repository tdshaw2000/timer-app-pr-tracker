// Everything the page needs from an uploaded file, in one call that is safe to run in a worker.
import { groupByPuzzle } from "./catalogue.js";
import { chartSeries } from "./chart-series.js";
import { importCubicTimer } from "./cubic-timer.js";
import { importCsTimer } from "./cs-timer.js";

function analyse({ solves, skipped }) {
  const entries = groupByPuzzle(solves).map(({ key, label, solves: own }) => ({
    key,
    label,
    count: own.length,
    series: { solve: chartSeries(own, "solve"), date: chartSeries(own, "date") },
  }));
  return { entries, skipped };
}

export function analyseCubicTimer(text) {
  return analyse(importCubicTimer(text));
}

// A csTimer export is a JSON object; a Cubic Timer export starts with its header row.
export function analyseExport(text) {
  const start = text.replace(/^\uFEFF/, "").trimStart();
  if (start.startsWith("{")) return analyse(importCsTimer(start));
  if (/^"?Puzzle"?;/.test(start)) return analyse(importCubicTimer(text));
  throw new Error("This is not a Cubic Timer or csTimer export.");
}

// Everything the page needs from an uploaded file, in one call that is safe to run in a worker.
import { groupByPuzzle } from "./catalogue.js";
import { chartSeries } from "./chart-series.js";
import { importCubicTimer } from "./cubic-timer.js";

export function analyseCubicTimer(text) {
  const { solves, skipped } = importCubicTimer(text);
  const entries = groupByPuzzle(solves).map(({ key, label, solves: own }) => ({
    key,
    label,
    count: own.length,
    series: { solve: chartSeries(own, "solve"), date: chartSeries(own, "date") },
  }));
  return { entries, skipped };
}

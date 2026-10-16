// Everything the page needs from an uploaded file, in one call that is safe to run in a worker.
import { groupByPuzzle, groupBySession } from "./catalogue.js";
import { chartSeries } from "./chart-series.js";
import { importCubicTimer } from "./cubic-timer.js";
import { importCsTimer } from "./cs-timer.js";

const withSeries = ({ key, label, solves }) => ({
  key,
  label,
  count: solves.length,
  series: { solve: chartSeries(solves, "solve"), date: chartSeries(solves, "date") },
});

// sessionEntries is null when the file has no sessions to group by (Cubic Timer).
function analyse({ solves, skipped }, { sessions = false } = {}) {
  const entries = groupByPuzzle(solves).map(withSeries);
  const sessionEntries = sessions ? groupBySession(solves).map(withSeries) : null;
  return { entries, sessionEntries, skipped };
}

export function analyseCubicTimer(text) {
  return analyse(importCubicTimer(text));
}

// A csTimer export is a JSON object; a Cubic Timer export starts with its header row.
export function analyseExport(text) {
  const start = text.replace(/^\uFEFF/, "").trimStart();
  if (start.startsWith("{")) return analyse(importCsTimer(start), { sessions: true });
  if (/^"?Puzzle"?;/.test(start)) return analyse(importCubicTimer(text));
  throw new Error("This is not a Cubic Timer or csTimer export.");
}

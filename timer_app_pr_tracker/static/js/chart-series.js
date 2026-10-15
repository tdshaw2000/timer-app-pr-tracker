// Turns one puzzle's solves into the lines a chart draws: one per average size that has any
// records. Each line holds only the record-setting points, so it ends at the last record rather
// than running on to the end of the axis.
import { AVERAGE_SIZES, prProgression } from "./pr-progression.js";

const X_VALUE = {
  solve: (point) => point.solveNumber,
  date: (point) => point.dateMs,
};

function labelFor(size) {
  return size === 1 ? "Single" : `Ao${size}`;
}

export function chartSeries(solves, axis) {
  const xOf = X_VALUE[axis];
  if (!xOf) throw new RangeError(`Unknown axis "${axis}": use "solve" or "date"`);

  return AVERAGE_SIZES.flatMap((size) => {
    const points = prProgression(solves, size).map((point) => ({
      x: xOf(point),
      y: point.valueMs / 1000,
    }));
    return points.length > 0 ? [{ size, label: labelFor(size), points }] : [];
  });
}

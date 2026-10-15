// Personal-record progression: for a given average size, the points where a new best was set.
// A solve is { dateMs, timeMs }, with timeMs null for a DNF, which counts as the worst result.
// An average drops 5% of its solves (rounded up) from each end and takes the mean of the rest.

export const AVERAGE_SIZES = [1, 5, 12, 50, 100, 1000];

export function trimCount(size) {
  return size === 1 ? 0 : Math.ceil(size * 0.05);
}

// Inserts into / removes from a sorted array of numbers (Infinity stands for a DNF).
function insertSorted(sorted, value) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] < value) low = mid + 1;
    else high = mid;
  }
  sorted.splice(low, 0, value);
}

function removeSorted(sorted, value) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] < value) low = mid + 1;
    else high = mid;
  }
  sorted.splice(low, 1);
}

// The trimmed mean of a full, sorted window, or null if a DNF is left after trimming.
function trimmedMean(sorted, trim) {
  let sum = 0;
  for (let i = trim; i < sorted.length - trim; i++) sum += sorted[i];
  return Number.isFinite(sum) ? sum / (sorted.length - 2 * trim) : null;
}

export function prProgression(solves, size) {
  const ordered = [...solves].sort((a, b) => a.dateMs - b.dateMs);
  const trim = trimCount(size);
  const values = ordered.map((s) => (s.timeMs === null ? Infinity : s.timeMs));
  const window = [];
  const points = [];
  let best = Infinity;

  for (let i = 0; i < ordered.length; i++) {
    insertSorted(window, values[i]);
    if (window.length > size) removeSorted(window, values[i - size]);
    if (window.length < size) continue;

    const value = trimmedMean(window, trim);
    if (value !== null && value < best) {
      best = value;
      points.push({ solveNumber: i + 1, dateMs: ordered[i].dateMs, valueMs: value });
    }
  }
  return points;
}

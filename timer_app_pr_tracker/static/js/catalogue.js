// Groups solves into the entries the page lets you pick from: one per puzzle and category.
// A category such as "3x3 on 4x4" is a puzzle in its own right and gets its own charts.

const PUZZLE_NAMES = {
  222: "2x2",
  333: "3x3",
  444: "4x4",
  555: "5x5",
  666: "6x6",
  777: "7x7",
  sq1: "Square-1",
  clock: "Clock",
  minx: "Megaminx",
  skewb: "Skewb",
  pyra: "Pyraminx",
};

function labelFor(puzzle, category) {
  const name = Object.hasOwn(PUZZLE_NAMES, puzzle) ? PUZZLE_NAMES[puzzle] : puzzle;
  return category === "Normal" ? name : `${name} · ${category}`;
}

export function groupByPuzzle(solves) {
  const entries = new Map();
  for (const solve of solves) {
    const key = `${solve.puzzle}|${solve.category}`;
    if (!entries.has(key)) {
      entries.set(key, { key, label: labelFor(solve.puzzle, solve.category), solves: [] });
    }
    entries.get(key).solves.push(solve);
  }
  return [...entries.values()].sort(
    (a, b) => b.solves.length - a.solves.length || a.label.localeCompare(b.label),
  );
}

import { describe, expect, it } from "vitest";
import { groupByPuzzle } from "../../timer_app_pr_tracker/static/js/catalogue.js";

const solve = (puzzle, category, dateMs = 1000) => ({
  puzzle,
  category,
  dateMs,
  timeMs: 10000,
  penalty: null,
});

describe("groupByPuzzle", () => {
  it("makes one entry per puzzle and category, each with its own solves", () => {
    const entries = groupByPuzzle([
      solve("333", "Normal", 1),
      solve("333", "3x3 on 4x4", 2),
      solve("333", "Normal", 3),
    ]);

    expect(entries.map((e) => [e.key, e.solves.map((s) => s.dateMs)])).toEqual([
      ["333|Normal", [1, 3]],
      ["333|3x3 on 4x4", [2]],
    ]);
  });

  it("names entries for people, adding the category when it is not Normal", () => {
    const labels = groupByPuzzle([
      solve("333", "Normal"),
      solve("444", "Normal"),
      solve("222", "Normal"),
      solve("skewb", "Normal"),
      solve("pyra", "Normal"),
      solve("333", "3x3 on 4x4"),
    ]).map((e) => e.label);

    expect(labels.sort()).toEqual(
      ["3x3", "4x4", "2x2", "Skewb", "Pyraminx", "3x3 · 3x3 on 4x4"].sort(),
    );
  });

  it("falls back to the stored name for a puzzle it does not know", () => {
    expect(groupByPuzzle([solve("megaminx", "Normal")])[0].label).toBe("megaminx");
  });

  it("uses a puzzle's stored name as is, even if it matches a built-in object property", () => {
    const labels = groupByPuzzle([solve("constructor", "Normal"), solve("toString", "Normal")])
      .map((e) => e.label)
      .sort();

    expect(labels).toEqual(["constructor", "toString"]);
  });

  it("lists the entry with the most solves first, then by name", () => {
    const entries = groupByPuzzle([
      solve("222", "Normal"),
      solve("333", "Normal"),
      solve("333", "Normal"),
      solve("444", "Normal"),
    ]);

    expect(entries.map((e) => e.label)).toEqual(["3x3", "2x2", "4x4"]);
  });

  it("gives no entries for no solves", () => {
    expect(groupByPuzzle([])).toEqual([]);
  });
});

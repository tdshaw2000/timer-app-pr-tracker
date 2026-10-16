import { describe, expect, it } from "vitest";
import { groupByPuzzle, groupBySession } from "../../timer_app_pr_tracker/static/js/catalogue.js";

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

  it("names the other puzzles csTimer can hold", () => {
    const puzzles = ["555", "666", "777", "sq1", "clock", "minx"];

    const labels = groupByPuzzle(puzzles.map((p) => solve(p, "Normal"))).map((e) => e.label);

    expect(labels.sort()).toEqual(["5x5", "6x6", "7x7", "Clock", "Megaminx", "Square-1"]);
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

describe("groupBySession", () => {
  const inSession = (number, name, puzzle, category, dateMs) => ({
    ...solve(puzzle, category, dateMs),
    session: { number, name },
  });

  it("makes one entry per session, in session order, each with that session's solves", () => {
    const entries = groupBySession([
      inSession(2, "OH", "333", "One-handed", 1),
      inSession(1, "Main", "333", "Normal", 2),
      inSession(2, "OH", "333", "One-handed", 3),
    ]);

    expect(entries.map((e) => [e.key, e.solves.map((s) => s.dateMs)])).toEqual([
      ["session|1", [2]],
      ["session|2", [1, 3]],
    ]);
  });

  it("labels each entry with the session name and its puzzle", () => {
    const entries = groupBySession([
      inSession(1, "Main", "333", "Normal", 1),
      inSession(2, "OH", "333", "One-handed", 2),
      inSession(3, "Pyra", "pyra", "Normal", 3),
    ]);

    expect(entries.map((e) => e.label)).toEqual([
      "Main · 3x3",
      "OH · 3x3 · One-handed",
      "Pyra · Pyraminx",
    ]);
  });

  it("keeps two sessions of the same puzzle apart, even with the same name", () => {
    const entries = groupBySession([
      inSession(1, "Practice", "333", "Normal", 1),
      inSession(2, "Practice", "333", "Normal", 2),
    ]);

    expect(entries.map((e) => e.key)).toEqual(["session|1", "session|2"]);
  });

  it("has no entry for a session with no solves, and none for solves with no session", () => {
    expect(groupBySession([solve("333", "Normal")])).toEqual([]);
  });
});

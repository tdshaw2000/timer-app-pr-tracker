// Samples are invented. See cubic-timer.test.js for the file layout.
import { describe, expect, it } from "vitest";
import { analyseCubicTimer, analyseExport } from "../../timer_app_pr_tracker/static/js/analysis.js";

const HEADER = '"Puzzle";"Category";"Time(millis)";"Date(millis)";"Scramble";"Penalty";"Comment"';
const row = (puzzle, category, timeMs, dateMs, penalty = 0) =>
  [puzzle, category, timeMs, dateMs, "R U", penalty, ""].map((f) => `"${f}"`).join(";");

describe("analyseCubicTimer", () => {
  const text = [
    HEADER,
    row("333", "Normal", 10000, 1000),
    row("333", "Normal", 9000, 2000),
    row("222", "Normal", 4000, 3000),
    row("333", "3x3 on 4x4", 80000, 4000),
  ].join("\n");

  it("gives one entry per puzzle and category, with its solve count", () => {
    const { entries } = analyseCubicTimer(text);

    expect(entries.map((e) => [e.label, e.count])).toEqual([
      ["3x3", 2],
      ["2x2", 1],
      ["3x3 · 3x3 on 4x4", 1],
    ]);
  });

  it("gives each entry its chart lines for both axes", () => {
    const [threeByThree] = analyseCubicTimer(text).entries;

    expect(threeByThree.series.solve[0]).toEqual({
      size: 1,
      label: "Single",
      points: [
        { x: 1, y: 10 },
        { x: 2, y: 9 },
      ],
    });
    expect(threeByThree.series.date[0].points.map((p) => p.x)).toEqual([1000, 2000]);
  });

  it("passes on the rows that were left out", () => {
    const { skipped } = analyseCubicTimer(`${text}\n${row("333", "Normal", 9000, 5000, 9)}`);

    expect(skipped).toEqual([{ line: 6, reason: expect.stringMatching(/penalty code 9/) }]);
  });

  it("rejects a file that is not a Cubic Timer export", () => {
    expect(() => analyseCubicTimer("hello")).toThrow(/Cubic Timer/);
  });
});

describe("analyseExport", () => {
  const cubic = [
    HEADER,
    row("333", "Normal", 10000, 1000),
    row("222", "Normal", 4000, 3000),
  ].join("\n");
  const csTimer = JSON.stringify({
    session1: [[[0, 8000], "R U", "", 1791966730]],
    session2: [[[0, 17000], "R U", "", 1791966740], [[0, "fast"], "R", "", 1791966750]],
    properties: { sessionData: JSON.stringify({ 1: { opt: { scrType: "pyrso" } }, 2: { opt: {} } }) },
  });

  it("reads a Cubic Timer file", () => {
    expect(analyseExport(cubic)).toEqual(analyseCubicTimer(cubic));
  });

  it("reads a csTimer file, with the rows it left out named by session and solve", () => {
    const { entries, skipped } = analyseExport(csTimer);

    expect(entries.map((e) => [e.label, e.count])).toEqual([
      ["3x3", 1],
      ["Pyraminx", 1],
    ]);
    expect(skipped).toEqual([
      { where: "session 2, solve 2", reason: expect.stringMatching(/time/i) },
    ]);
  });

  it("also groups a csTimer file by session, each session with its own charts", () => {
    const { sessionEntries } = analyseExport(csTimer);

    expect(sessionEntries.map((e) => [e.key, e.label, e.count])).toEqual([
      ["session|1", "1 · Pyraminx", 1],
      ["session|2", "2 · 3x3", 1],
    ]);
    expect(sessionEntries[0].series.solve[0].points).toEqual([{ x: 1, y: 8 }]);
  });

  it("has no session grouping for a Cubic Timer file, which has no sessions", () => {
    expect(analyseExport(cubic).sessionEntries).toBeNull();
  });

  it("tells the two formats apart even with a byte order mark or leading blank lines", () => {
    expect(analyseExport(`\uFEFF\n  ${csTimer}`).entries).toHaveLength(2);
    expect(analyseExport(`\uFEFF${cubic}`).entries).toHaveLength(2);
  });

  it("says which formats it knows when the file is neither", () => {
    for (const text of ["hello", "", "[1, 2]", "Session;Time\n1;2"]) {
      expect(() => analyseExport(text), text).toThrow(/Cubic Timer or csTimer/);
    }
  });
});

// Samples are invented. See cubic-timer.test.js for the file layout.
import { describe, expect, it } from "vitest";
import { analyseCubicTimer } from "../../timer_app_pr_tracker/static/js/analysis.js";

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

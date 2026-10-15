// Samples are invented; real exports are the owner's personal data and stay out of the repo.
import { describe, expect, it } from "vitest";
import { parseCubicTimer } from "../../timer_app_pr_tracker/static/js/cubic-timer.js";

const HEADER = '"Puzzle";"Category";"Time(millis)";"Date(millis)";"Scramble";"Penalty";"Comment"';
const row = (...fields) => fields.map((f) => `"${f}"`).join(";");

describe("parseCubicTimer", () => {
  it("reads each row into a raw solve, with numbers as numbers", () => {
    const text = [HEADER, row("333", "Normal", "20500", "1766653366566", "R U R'", "0", "")].join(
      "\n",
    );

    const { solves, skipped } = parseCubicTimer(text);

    expect(skipped).toEqual([]);
    expect(solves).toEqual([
      {
        puzzle: "333",
        category: "Normal",
        timeMs: 20500,
        dateMs: 1766653366566,
        scramble: "R U R'",
        penaltyCode: 0,
        comment: "",
      },
    ]);
  });

  it("keeps the penalty code as stored, leaving its meaning to the caller", () => {
    const text = [
      HEADER,
      row("333", "Normal", "18791", "1766653366566", "R", "1", ""),
      row("333", "Normal", "2965", "1766653466566", "U", "2", ""),
    ].join("\n");

    expect(parseCubicTimer(text).solves.map((s) => s.penaltyCode)).toEqual([1, 2]);
  });

  it("copes with a byte order mark, CRLF line endings and a trailing newline", () => {
    const text = `﻿${HEADER}\r\n${row("222", "Normal", "4100", "1766653366566", "F", "0", "")}\r\n`;

    const { solves } = parseCubicTimer(text);

    expect(solves).toHaveLength(1);
    expect(solves[0].puzzle).toBe("222");
  });

  it("reads semicolons and doubled quotes inside a quoted field", () => {
    const text = [
      HEADER,
      row("333", "Normal", "20500", "1766653366566", "R U", "0", 'popped; "lol"'),
    ].join("\n");

    expect(parseCubicTimer(text).solves[0].comment).toBe('popped; "lol"');
  });

  it("gives no solves for a file with only the header", () => {
    expect(parseCubicTimer(HEADER).solves).toEqual([]);
  });

  it("rejects a file that is not a Cubic Timer export", () => {
    expect(() => parseCubicTimer("Session;Time\n1;2")).toThrow(/Cubic Timer/);
    expect(() => parseCubicTimer("")).toThrow(/Cubic Timer/);
  });

  it("skips a bad row and says which line and why, keeping the good ones", () => {
    const text = [
      HEADER,
      row("333", "Normal", "20500", "1766653366566", "R", "0", ""),
      row("333", "Normal", "fast", "1766653466566", "R", "0", ""),
      '"333";"Normal"',
      row("333", "Normal", "19000", "1766653566566", "R", "0", ""),
    ].join("\n");

    const { solves, skipped } = parseCubicTimer(text);

    expect(solves.map((s) => s.timeMs)).toEqual([20500, 19000]);
    expect(skipped).toEqual([
      { line: 3, reason: expect.stringMatching(/time/i) },
      { line: 4, reason: expect.stringMatching(/7 fields/) },
    ]);
  });
});

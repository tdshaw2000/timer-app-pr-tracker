// Samples are invented; real exports are the owner's personal data and stay out of the repo.
import { describe, expect, it } from "vitest";
import { importCsTimer } from "../../timer_app_pr_tracker/static/js/cs-timer.js";

// A csTimer export is JSON: sessionN arrays of [[penalty, ms], scramble, comment, unixSeconds],
// plus properties.sessionData, which is itself a JSON string describing each session.
const solve = (time, seconds, penalty = 0) => [[penalty, time], "R U", "", seconds];

function exportOf(sessions, types = {}) {
  const file = {};
  const sessionData = {};
  for (let n = 1; n <= 3; n++) {
    file[`session${n}`] = sessions[n] ?? [];
    sessionData[n] = { name: n, opt: types[n] ? { scrType: types[n] } : {}, rank: n };
  }
  file.properties = { sessionData: JSON.stringify(sessionData) };
  return JSON.stringify(file);
}

describe("importCsTimer", () => {
  it("reads each solve into the shape the statistics use, with the date in milliseconds", () => {
    const { solves, skipped } = importCsTimer(exportOf({ 1: [solve(17300, 1791966730)] }));

    expect(skipped).toEqual([]);
    expect(solves).toEqual([
      { puzzle: "333", category: "Normal", dateMs: 1791966730000, timeMs: 17300, penalty: null },
    ]);
  });

  it("takes the puzzle from the session's scramble type, and 3x3 when none is set", () => {
    const { solves } = importCsTimer(
      exportOf(
        { 1: [solve(8000, 1791966730)], 2: [solve(17000, 1791966740)], 3: [solve(2500, 1791966750)] },
        { 1: "pyrso", 3: "222so" },
      ),
    );

    expect(solves.map((s) => [s.puzzle, s.category])).toEqual([
      ["pyra", "Normal"],
      ["333", "Normal"],
      ["222", "Normal"],
    ]);
  });

  it("treats other 3x3 events as categories of 3x3, like Cubic Timer's own", () => {
    const { solves } = importCsTimer(
      exportOf({ 1: [solve(30000, 1791966730)], 2: [solve(90000, 1791966740)] }, { 1: "333oh", 2: "333ni" }),
    );

    expect(solves.map((s) => [s.puzzle, s.category])).toEqual([
      ["333", "One-handed"],
      ["333", "Blindfolded"],
    ]);
  });

  it("keeps an event it does not know under its own scramble type instead of guessing", () => {
    const { solves } = importCsTimer(exportOf({ 1: [solve(8000, 1791966730)] }, { 1: "mystery" }));

    expect(solves.map((s) => [s.puzzle, s.category])).toEqual([["mystery", "Normal"]]);
  });

  it("puts every session of the same puzzle together, in session order", () => {
    const { solves } = importCsTimer(
      exportOf({ 1: [solve(9000, 1791966730)], 2: [solve(8000, 1791966740), solve(7000, 1791966750)] }),
    );

    expect(solves.map((s) => s.timeMs)).toEqual([9000, 8000, 7000]);
  });

  it("reads -1 as a DNF with no time", () => {
    const { solves } = importCsTimer(exportOf({ 1: [solve(12000, 1791966730, -1)] }));

    expect(solves[0]).toMatchObject({ timeMs: null, penalty: "DNF" });
  });

  it("reads 2000 as +2, adding the 2 seconds to the stored time, which excludes them", () => {
    const { solves } = importCsTimer(exportOf({ 1: [solve(12000, 1791966730, 2000)] }));

    expect(solves[0]).toMatchObject({ timeMs: 14000, penalty: "+2" });
  });

  it("assumes nothing about sessionData: no description means 3x3 for every session", () => {
    const text = JSON.stringify({ session1: [solve(9000, 1791966730)], properties: {} });

    expect(importCsTimer(text).solves.map((s) => s.puzzle)).toEqual(["333"]);
  });

  it("skips a solve it cannot read and says which session and solve it was", () => {
    const { solves, skipped } = importCsTimer(
      exportOf({
        1: [
          solve(9000, 1791966730),
          solve("fast", 1791966740),
          solve(9500, 1791966750, 700),
          [[0, 9000], "R", ""],
          solve(9200, 1791966760),
        ],
      }),
    );

    expect(solves.map((s) => s.timeMs)).toEqual([9000, 9200]);
    expect(skipped).toEqual([
      { where: "session 1, solve 2", reason: expect.stringMatching(/time/i) },
      { where: "session 1, solve 3", reason: expect.stringMatching(/penalty 700/) },
      { where: "session 1, solve 4", reason: expect.stringMatching(/date/i) },
    ]);
  });

  it("skips a date beyond what a calendar can show", () => {
    const { solves, skipped } = importCsTimer(exportOf({ 1: [solve(9000, 9e15)] }));

    expect(solves).toEqual([]);
    expect(skipped).toEqual([{ where: "session 1, solve 1", reason: expect.stringMatching(/date/i) }]);
  });

  it("gives no solves for an export with empty sessions", () => {
    expect(importCsTimer(exportOf({}))).toEqual({ solves: [], skipped: [] });
  });

  it("rejects text that is not a csTimer export", () => {
    for (const text of ["hello", "", "[]", "{}", '{"session1": 5}', '{"a": [1]}']) {
      expect(() => importCsTimer(text), text).toThrow(/csTimer/);
    }
  });
});

// Samples are invented. A solve is { dateMs, timeMs }, with timeMs null for a DNF.
import { describe, expect, it } from "vitest";
import {
  AVERAGE_SIZES,
  prProgression,
  trimCount,
} from "../../timer_app_pr_tracker/static/js/pr-progression.js";

const solvesFrom = (seconds) =>
  seconds.map((s, i) => ({ dateMs: 1_000_000 + i * 1000, timeMs: s === null ? null : s * 1000 }));

describe("trimCount", () => {
  it("trims 5% from each end, rounded up", () => {
    expect([1, 5, 12, 50, 100, 1000].map(trimCount)).toEqual([0, 1, 1, 3, 5, 50]);
  });

  it("lists the sizes the charts show", () => {
    expect(AVERAGE_SIZES).toEqual([1, 5, 12, 50, 100, 1000]);
  });
});

describe("prProgression of single solves", () => {
  it("keeps only solves that beat every earlier one, numbered from 1", () => {
    const points = prProgression(solvesFrom([10, 12, 9, 9, 8]), 1);

    expect(points).toEqual([
      { solveNumber: 1, dateMs: 1_000_000, valueMs: 10000 },
      { solveNumber: 3, dateMs: 1_002_000, valueMs: 9000 },
      { solveNumber: 5, dateMs: 1_004_000, valueMs: 8000 },
    ]);
  });

  it("ignores a DNF", () => {
    const points = prProgression(solvesFrom([null, 10, null, 9]), 1);

    expect(points.map((p) => p.solveNumber)).toEqual([2, 4]);
  });

  it("gives nothing for no solves", () => {
    expect(prProgression([], 1)).toEqual([]);
  });
});

describe("prProgression of averages", () => {
  it("averages each window of 5 without its fastest and slowest, and keeps the new bests", () => {
    const points = prProgression(solvesFrom([10, 12, 11, 13, 9, 8, 20]), 5);

    expect(points.map((p) => p.solveNumber)).toEqual([5, 6]);
    expect(points[0].valueMs).toBeCloseTo(11000);
    expect(points[1].valueMs).toBeCloseTo((9000 + 11000 + 12000) / 3);
    expect(points[1].dateMs).toBe(1_005_000);
  });

  it("starts at the first full window", () => {
    expect(prProgression(solvesFrom([10, 10, 10, 10]), 5)).toEqual([]);
  });

  it("trims one DNF away but not two, in an average of 5", () => {
    expect(prProgression(solvesFrom([10, 10, 10, 10, null]), 5)).toHaveLength(1);
    expect(prProgression(solvesFrom([10, 10, 10, null, null]), 5)).toEqual([]);
  });

  it("trims 3 from each end in an average of 50, so 3 DNFs pass and 4 do not", () => {
    const fifty = (dnfs) => solvesFrom(Array.from({ length: 50 }, (_, i) => (i < dnfs ? null : 10)));

    expect(prProgression(fifty(3), 50)).toHaveLength(1);
    expect(prProgression(fifty(4), 50)).toEqual([]);
  });

  it("slides the window past a DNF once it has left", () => {
    const points = prProgression(solvesFrom([null, null, 10, 10, 10, 10, 10, 9, 9, 9]), 5);

    expect(points.map((p) => p.solveNumber)).toEqual([6, 9, 10]);
  });

  it("orders by date first, and does not change the solves it is given", () => {
    const solves = [
      { dateMs: 3000, timeMs: 8000 },
      { dateMs: 1000, timeMs: 10000 },
      { dateMs: 2000, timeMs: 9000 },
    ];

    const points = prProgression(solves, 1);

    expect(points.map((p) => p.valueMs)).toEqual([10000, 9000, 8000]);
    expect(points.map((p) => p.solveNumber)).toEqual([1, 2, 3]);
    expect(solves[0].dateMs).toBe(3000);
  });
});

// Samples are invented. A solve is { dateMs, timeMs }, with timeMs null for a DNF.
import { describe, expect, it } from "vitest";
import { chartSeries } from "../../timer_app_pr_tracker/static/js/chart-series.js";

const solvesFrom = (seconds) =>
  seconds.map((s, i) => ({ dateMs: 5_000_000 + i * 60_000, timeMs: s === null ? null : s * 1000 }));

describe("chartSeries", () => {
  it("makes one named line per average size that has any records", () => {
    const series = chartSeries(solvesFrom([10, 9, 8, 7, 6, 5]), "solve");

    expect(series.map((s) => s.label)).toEqual(["Single", "Ao5"]);
    expect(series.map((s) => s.size)).toEqual([1, 5]);
  });

  it("plots records against the solve number, in seconds", () => {
    const [single] = chartSeries(solvesFrom([10, 12, 9.5]), "solve");

    expect(single.points).toEqual([
      { x: 1, y: 10 },
      { x: 3, y: 9.5 },
    ]);
  });

  it("plots records against the date of the solve that set them", () => {
    const [single] = chartSeries(solvesFrom([10, 12, 9.5]), "date");

    expect(single.points).toEqual([
      { x: 5_000_000, y: 10 },
      { x: 5_120_000, y: 9.5 },
    ]);
  });

  it("stops each line at its last record, however many solves follow", () => {
    const [single, ao5] = chartSeries(solvesFrom([10, 9, 8, 7, 6, 20, 20, 20, 20, 20, 20, 20]), "solve");

    expect(single.points.at(-1).x).toBe(5);
    expect(ao5.points.at(-1).x).toBe(5);
  });

  it("gives no lines for no solves", () => {
    expect(chartSeries([], "solve")).toEqual([]);
  });

  it("refuses an axis it does not know", () => {
    expect(() => chartSeries(solvesFrom([10]), "weeks")).toThrow(/axis/);
    expect(() => chartSeries(solvesFrom([10]), "constructor")).toThrow(/axis/);
  });
});

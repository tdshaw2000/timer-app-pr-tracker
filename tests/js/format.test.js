import { describe, expect, it } from "vitest";
import {
  formatDay,
  formatTime,
  skippedSummary,
} from "../../timer_app_pr_tracker/static/js/format.js";

describe("formatTime", () => {
  it("shows seconds to hundredths", () => {
    expect([10.66, 9, 0.5, 4.35, 1.1].map(formatTime)).toEqual([
      "10.66",
      "9.00",
      "0.50",
      "4.35",
      "1.10",
    ]);
  });

  it("shows minutes once a minute has passed, and hours after that", () => {
    expect([75.5, 60, 3723.04].map(formatTime)).toEqual(["1:15.50", "1:00.00", "1:02:03.04"]);
  });

  it("truncates rather than rounds", () => {
    expect(formatTime(10.669999)).toBe("10.66");
  });
});

describe("formatDay", () => {
  it("shows the day as year-month-day in the given time zone", () => {
    expect(formatDay(Date.UTC(2026, 8, 21, 23, 30), "UTC")).toBe("2026-09-21");
    expect(formatDay(Date.UTC(2026, 8, 21, 23, 30), "Pacific/Auckland")).toBe("2026-09-22");
  });
});

describe("skippedSummary", () => {
  it("says nothing when nothing was left out", () => {
    expect(skippedSummary([])).toBe("");
  });

  it("counts the rows and names the first few with their line and reason", () => {
    const skipped = [
      { line: 3, reason: "unknown penalty code 7" },
      { line: 9, reason: "time is not a whole number" },
    ];

    expect(skippedSummary(skipped)).toBe(
      "2 rows were left out: line 3 (unknown penalty code 7), line 9 (time is not a whole number)",
    );
  });

  it("uses the singular for one row", () => {
    expect(skippedSummary([{ line: 3, reason: "bad" }])).toBe("1 row was left out: line 3 (bad)");
  });

  it("lists only the first five, then how many more", () => {
    const skipped = Array.from({ length: 8 }, (_, i) => ({ line: i + 2, reason: "bad" }));

    expect(skippedSummary(skipped)).toBe(
      "8 rows were left out: line 2 (bad), line 3 (bad), line 4 (bad), line 5 (bad), line 6 (bad) and 3 more",
    );
  });
});

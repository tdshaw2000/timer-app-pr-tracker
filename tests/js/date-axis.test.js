import { describe, expect, it } from "vitest";
import { dateAxisEnd, dateTicks } from "../../timer_app_pr_tracker/static/js/date-axis.js";

const endOfDay = (year, month, day) => new Date(year, month, day + 1).getTime() - 1;

describe("dateAxisEnd", () => {
  it("is the last millisecond of today in the viewer's time zone", () => {
    const morning = new Date(2026, 9, 15, 0, 0, 0, 0).getTime();
    const night = new Date(2026, 9, 15, 23, 59, 59, 999).getTime();

    expect(dateAxisEnd(morning)).toBe(endOfDay(2026, 9, 15));
    expect(dateAxisEnd(night)).toBe(endOfDay(2026, 9, 15));
  });

  it("covers a solve made later today", () => {
    const now = new Date(2026, 9, 15, 9, 0).getTime();
    const laterToday = new Date(2026, 9, 15, 22, 0).getTime();

    expect(dateAxisEnd(now)).toBeGreaterThanOrEqual(laterToday);
  });

  it("does not cut off a point dated after today", () => {
    const now = new Date(2026, 9, 15, 9, 0).getTime();
    const future = new Date(2026, 9, 20, 9, 0).getTime();

    expect(dateAxisEnd(now, future)).toBe(future);
  });

  it("ignores a latest point that is earlier than today", () => {
    const now = new Date(2026, 9, 15, 9, 0).getTime();

    expect(dateAxisEnd(now, new Date(2025, 4, 1).getTime())).toBe(endOfDay(2026, 9, 15));
  });
});

describe("dateTicks", () => {
  const at = (year, month, day, hour = 0) => new Date(year, month, day, hour).getTime();

  it("on a range of about two days, ticks every 12 hours, so the midnight in range is kept", () => {
    const min = at(2026, 10, 5, 15);
    const max = endOfDay(2026, 10, 7);

    expect(dateTicks(min, max)).toEqual([
      at(2026, 10, 6),
      at(2026, 10, 6, 12),
      at(2026, 10, 7),
      at(2026, 10, 7, 12),
    ]);
  });

  it("within one day, ticks on whole hours that fit", () => {
    const min = at(2026, 10, 7, 9);
    const max = endOfDay(2026, 10, 7);

    expect(dateTicks(min, max)).toEqual([
      at(2026, 10, 7, 9),
      at(2026, 10, 7, 12),
      at(2026, 10, 7, 15),
      at(2026, 10, 7, 18),
      at(2026, 10, 7, 21),
    ]);
  });

  it("on a long range, ticks on whole days counted back from the last day", () => {
    const ticks = dateTicks(at(2026, 0, 1), endOfDay(2026, 9, 31), 6);

    expect(ticks).toEqual([0, 1, 2, 3, 4, 5].map((back) => at(2026, 9, 31 - 51 * (5 - back))));
  });

  it("falls back to the two ends when no tick fits", () => {
    const min = at(2026, 10, 7, 9) + 60_000;
    const max = min + 10 * 60_000;

    expect(dateTicks(min, max)).toEqual([min, max]);
  });
});

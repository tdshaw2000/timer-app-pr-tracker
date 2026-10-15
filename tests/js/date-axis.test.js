import { describe, expect, it } from "vitest";
import { dateAxisEnd } from "../../timer_app_pr_tracker/static/js/date-axis.js";

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

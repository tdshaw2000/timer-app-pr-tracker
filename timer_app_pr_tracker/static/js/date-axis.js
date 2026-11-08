// Where the date axis ends: the last millisecond of today in the viewer's time zone, so a solve
// made later today is not clipped. A point dated after that (a clock set wrong) still fits.

export function dateAxisEnd(nowMs, latestMs = -Infinity) {
  const now = new Date(nowMs);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1;
  return Math.max(endOfToday, latestMs);
}

import { formatDay, formatDayTime } from "./format.js";

// Tick positions for the date axis, all on local clock times so no label repeats. When two or
// more local midnights fit, it ticks on midnights only, a whole number of days apart, counted back
// from the last day so the newest day is labelled. Shorter ranges tick on whole hours (every 1, 2,
// 3, 6 or 12 hours, the smallest step with at most maxCount ticks). If no tick fits, the two ends
// are used.
const HOUR_STEPS = [1, 2, 3, 6, 12];

// Stops once there are more than maxCount ticks, since the caller then moves to a larger step.
function hourTicks(minMs, maxMs, step, maxCount) {
  const first = new Date(minMs);
  let hour = Math.floor(first.getHours() / step) * step;
  const ticks = [];
  for (;;) {
    const tick = new Date(first.getFullYear(), first.getMonth(), first.getDate(), hour).getTime();
    if (tick > maxMs) return ticks;
    // A local hour skipped by the clocks going forward rolls over to the next, so drop repeats.
    if (tick >= minMs && tick !== ticks.at(-1)) ticks.push(tick);
    if (ticks.length > maxCount) return ticks;
    hour += step;
  }
}

export function dateTicks(minMs, maxMs, maxCount = 6) {
  const last = new Date(maxMs);
  const midnightBack = (days) =>
    new Date(last.getFullYear(), last.getMonth(), last.getDate() - days).getTime();
  let days = 0;
  while (midnightBack(days) >= minMs) days += 1;

  if (days >= 2) {
    const step = Math.ceil(days / maxCount);
    const ticks = [];
    for (let back = 0; back < days; back += step) ticks.unshift(midnightBack(back));
    return ticks;
  }

  for (const step of HOUR_STEPS) {
    const ticks = hourTicks(minMs, maxMs, step, maxCount);
    if (ticks.length > maxCount) continue;
    if (ticks.length >= 2) return ticks;
    break;
  }
  return [minMs, maxMs];
}

// A tick's label: a midnight is its day. Any other tick shows its time, with the day added only
// on the first tick, so the axis says which day it is without repeating it.
export function dateTickLabel(ms, index) {
  const date = new Date(ms);
  const atMidnight = date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;
  if (atMidnight) return formatDay(ms);
  const dayTime = formatDayTime(ms);
  return index === 0 ? dayTime : dayTime.slice(dayTime.indexOf(" ") + 1);
}

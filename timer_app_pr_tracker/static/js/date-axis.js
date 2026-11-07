// Where the date axis ends: the last millisecond of today in the viewer's time zone, so a solve
// made later today is not clipped. A point dated after that (a clock set wrong) still fits.

export function dateAxisEnd(nowMs, latestMs = -Infinity) {
  const now = new Date(nowMs);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1;
  return Math.max(endOfToday, latestMs);
}

// Tick positions for the date axis, all on local clock times so no label repeats. Short ranges
// tick on whole hours (every 1, 2, 3, 6 or 12 hours, the smallest step with at most maxCount
// ticks). Longer ranges tick on local midnights, a whole number of days apart, counted back from
// the last day so the newest day is labelled. If no tick fits, the two ends are used.
const HOUR_STEPS = [1, 2, 3, 6, 12];

function hourTicks(minMs, maxMs, step) {
  const first = new Date(minMs);
  let hour = Math.floor(first.getHours() / step) * step;
  const ticks = [];
  for (;;) {
    const tick = new Date(first.getFullYear(), first.getMonth(), first.getDate(), hour).getTime();
    if (tick > maxMs) return ticks;
    if (tick >= minMs) ticks.push(tick);
    hour += step;
  }
}

export function dateTicks(minMs, maxMs, maxCount = 6) {
  for (const step of HOUR_STEPS) {
    const ticks = hourTicks(minMs, maxMs, step);
    if (ticks.length > maxCount) continue;
    return ticks.length >= 2 ? ticks : [minMs, maxMs];
  }

  const last = new Date(maxMs);
  const midnightBack = (days) =>
    new Date(last.getFullYear(), last.getMonth(), last.getDate() - days).getTime();
  let days = 0;
  while (midnightBack(days) >= minMs) days += 1;

  const step = Math.ceil(days / maxCount);
  const ticks = [];
  for (let back = 0; back < days; back += step) ticks.unshift(midnightBack(back));
  return ticks;
}

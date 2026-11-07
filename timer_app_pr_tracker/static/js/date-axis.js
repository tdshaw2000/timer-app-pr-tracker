// Where the date axis ends: the last millisecond of today in the viewer's time zone, so a solve
// made later today is not clipped. A point dated after that (a clock set wrong) still fits.

export function dateAxisEnd(nowMs, latestMs = -Infinity) {
  const now = new Date(nowMs);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1;
  return Math.max(endOfToday, latestMs);
}

// Tick positions for the date axis: local midnights, so each day is labelled once. The step grows
// in whole days to keep at most maxCount ticks. When fewer than two midnights fit (a short range),
// the two ends are used instead and the page labels them with the time of day.
export function dateTicks(minMs, maxMs, maxCount = 6) {
  const first = new Date(minMs);
  const firstDay = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const start = firstDay.getTime() < minMs ? firstDay.getDate() + 1 : firstDay.getDate();
  const midnightAt = (offset) => new Date(first.getFullYear(), first.getMonth(), start + offset).getTime();

  let days = 0;
  while (midnightAt(days) <= maxMs) days += 1;
  if (days < 2) return [minMs, maxMs];

  const step = Math.ceil(days / maxCount);
  const ticks = [];
  for (let offset = 0; offset < days; offset += step) ticks.push(midnightAt(offset));
  return ticks;
}

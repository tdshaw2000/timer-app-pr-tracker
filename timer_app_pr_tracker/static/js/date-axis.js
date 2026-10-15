// Where the date axis ends: the last millisecond of today in the viewer's time zone, so a solve
// made later today is not clipped. A point dated after that (a clock set wrong) still fits.

export function dateAxisEnd(nowMs, latestMs = -Infinity) {
  const now = new Date(nowMs);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1;
  return Math.max(endOfToday, latestMs);
}

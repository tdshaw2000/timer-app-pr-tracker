// Text for the page. Times are truncated to hundredths, never rounded.

export function formatTime(seconds) {
  // The small addition stops 4.35 * 100 = 434.99999999999994 from losing a hundredth.
  const hundredths = Math.floor(seconds * 100 + 1e-6);
  const whole = Math.floor(hundredths / 100);
  const fraction = String(hundredths % 100).padStart(2, "0");
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${fraction}`;
  }
  if (minutes > 0) return `${minutes}:${String(secs).padStart(2, "0")}.${fraction}`;
  return `${secs}.${fraction}`;
}

export function formatDay(ms, timeZone) {
  // The en-CA locale writes dates as year-month-day.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
}

const LISTED = 5;

export function skippedSummary(skipped) {
  if (skipped.length === 0) return "";
  const noun = skipped.length === 1 ? "row was" : "rows were";
  const listed = skipped
    .slice(0, LISTED)
    .map(({ line, where = `line ${line}`, reason }) => `${where} (${reason})`)
    .join(", ");
  const more = skipped.length > LISTED ? ` and ${skipped.length - LISTED} more` : "";
  return `${skipped.length} ${noun} left out: ${listed}${more}`;
}

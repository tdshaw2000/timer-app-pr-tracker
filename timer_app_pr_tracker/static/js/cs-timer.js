// Reads a csTimer export: JSON with a `sessionN` array of solves per session, each solve being
// [[penalty, ms], scramble, comment, unixSeconds], plus properties.sessionData, a JSON string
// that says which puzzle each session is for. The result has the same shape as importCubicTimer.
import { MAX_DATE_MS } from "./cubic-timer.js";

const NOT_AN_EXPORT = "This is not a csTimer export.";

// csTimer's scramble types, as puzzle and category in the terms the rest of the page uses. A type
// that is missing here is kept under its own name rather than guessed at.
const EVENTS = {
  333: ["333", "Normal"],
  "333oh": ["333", "One-handed"],
  "333bf": ["333", "Blindfolded"],
  "222so": ["222", "Normal"],
  "444wca": ["444", "Normal"],
  "555wca": ["555", "Normal"],
  "666wca": ["666", "Normal"],
  "777wca": ["777", "Normal"],
  pyrso: ["pyra", "Normal"],
  skbso: ["skewb", "Normal"],
  sqrs: ["sq1", "Normal"],
  clkwca: ["clock", "Normal"],
  mgmp: ["minx", "Normal"],
};

function eventFor(scrType) {
  if (scrType === undefined) return EVENTS[333];
  return Object.hasOwn(EVENTS, scrType) ? EVENTS[scrType] : [String(scrType), "Normal"];
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(NOT_AN_EXPORT);
  }
}

function readSettings(file) {
  const raw = file.properties?.sessionData;
  if (raw === undefined) return {};
  const settings = parseJson(raw);
  if (settings === null || typeof settings !== "object") throw new Error(NOT_AN_EXPORT);
  return settings;
}

const isCount = (value) => Number.isSafeInteger(value) && value >= 0;

function readSolve(entry, [puzzle, category]) {
  if (!Array.isArray(entry) || !Array.isArray(entry[0])) return { reason: "not a solve" };
  const [penalty, time] = entry[0];
  if (!isCount(time)) return { reason: `time is not a whole number of milliseconds: "${time}"` };
  const seconds = entry[3];
  if (!isCount(seconds)) return { reason: `date is not a whole number of seconds: "${seconds}"` };
  const dateMs = seconds * 1000;
  if (dateMs > MAX_DATE_MS) return { reason: `date is beyond the calendar's range: "${seconds}"` };

  const base = { puzzle, category, dateMs };
  // csTimer stores a +2 solve's time without the 2 seconds, so they are added here.
  if (penalty === 0) return { solve: { ...base, timeMs: time, penalty: null } };
  if (penalty === 2000) return { solve: { ...base, timeMs: time + 2000, penalty: "+2" } };
  if (penalty === -1) return { solve: { ...base, timeMs: null, penalty: "DNF" } };
  return { reason: `unknown penalty ${penalty}` };
}

export function importCsTimer(text) {
  const file = parseJson(text);
  if (file === null || typeof file !== "object" || Array.isArray(file)) {
    throw new Error(NOT_AN_EXPORT);
  }
  const sessions = Object.keys(file)
    .map((key) => /^session(\d+)$/.exec(key))
    .filter(Boolean)
    .map(([key, number]) => ({ key, number: Number(number) }))
    .sort((a, b) => a.number - b.number);
  if (sessions.length === 0 || sessions.some(({ key }) => !Array.isArray(file[key]))) {
    throw new Error(NOT_AN_EXPORT);
  }
  const settings = readSettings(file);

  const solves = [];
  const skipped = [];
  for (const { key, number } of sessions) {
    const event = eventFor(settings[number]?.opt?.scrType);
    file[key].forEach((entry, index) => {
      const { solve, reason } = readSolve(entry, event);
      if (solve) solves.push(solve);
      else skipped.push({ where: `session ${number}, solve ${index + 1}`, reason });
    });
  }
  return { solves, skipped };
}

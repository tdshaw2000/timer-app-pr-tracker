// Reads a Cubic Timer export: semicolon-separated, every field quoted, one solve per row.
// This only reads the file. What a penalty code means is decided by the caller.

const COLUMNS = [
  "Puzzle",
  "Category",
  "Time(millis)",
  "Date(millis)",
  "Scramble",
  "Penalty",
  "Comment",
];

// Splits text into rows of fields, honouring quotes ("" is a literal quote) so a quoted
// field can hold semicolons. Each row keeps the line number it starts on. If a quote is still
// open at the end, the row it left unfinished is dropped and the line that row began on is
// returned.
function readRows(text) {
  const rows = [];
  let fields = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  const endRow = () => {
    fields.push(field);
    if (fields.length > 1 || fields[0] !== "") rows.push({ line: rowLine, fields });
    fields = [];
    field = "";
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        if (c === "\n") line++;
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ";") {
      fields.push(field);
      field = "";
    } else if (c === "\r") {
      continue;
    } else if (c === "\n") {
      endRow();
      line++;
      rowLine = line;
    } else {
      field += c;
    }
  }
  if (quoted) return { rows, unterminatedQuoteLine: rowLine };
  endRow();
  return { rows, unterminatedQuoteLine: null };
}

function toInteger(value) {
  const number = /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) ? number : null;
}

function readSolve(fields) {
  if (fields.length !== COLUMNS.length) {
    return { reason: `expected ${COLUMNS.length} fields, found ${fields.length}` };
  }
  const [puzzle, category, time, date, scramble, penalty, comment] = fields;
  const timeMs = toInteger(time);
  if (timeMs === null) return { reason: `time is not a whole number of milliseconds: "${time}"` };
  const dateMs = toInteger(date);
  if (dateMs === null) return { reason: `date is not a whole number of milliseconds: "${date}"` };
  const penaltyCode = toInteger(penalty);
  if (penaltyCode === null) return { reason: `penalty is not a number: "${penalty}"` };
  return { solve: { puzzle, category, timeMs, dateMs, scramble, penaltyCode, comment } };
}

export function parseCubicTimer(text) {
  const { rows, unterminatedQuoteLine } = readRows(text.replace(/^\uFEFF/, ""));
  const [header, ...body] = rows;
  if (!header || header.fields.join(";") !== COLUMNS.join(";")) {
    throw new Error("This is not a Cubic Timer export: the header row is missing or different.");
  }

  const solves = [];
  const skipped = [];
  for (const { line, fields } of body) {
    const { solve, reason } = readSolve(fields);
    if (solve) solves.push(solve);
    else skipped.push({ line, reason });
  }
  if (unterminatedQuoteLine !== null) {
    skipped.push({
      line: unterminatedQuoteLine,
      reason: "unterminated quote, the rest of the file was ignored",
    });
  }
  return { solves, skipped };
}

// Turns a raw solve into the shape the statistics use. Code 1 is +2 and code 2 is DNF
// (confirmed by the owner against the app). The stored time of a +2 solve already includes the
// 2 seconds (owner's answer, 2026-10-15), so it is kept as stored. A DNF has no time. The
// scramble and comment are dropped: nothing downstream needs them.
export function normaliseCubicSolve(raw) {
  const { puzzle, category, dateMs, timeMs, penaltyCode } = raw;
  const base = { puzzle, category, dateMs };
  switch (penaltyCode) {
    case 0:
      return { ...base, timeMs, penalty: null };
    case 1:
      return { ...base, timeMs, penalty: "+2" };
    case 2:
      return { ...base, timeMs: null, penalty: "DNF" };
    default:
      throw new RangeError(`Unknown penalty code ${penaltyCode}`);
  }
}

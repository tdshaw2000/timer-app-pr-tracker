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
// field can hold semicolons. Each row keeps the line number it starts on.
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
  endRow();
  return rows;
}

function toInteger(value) {
  return /^\d+$/.test(value) ? Number(value) : null;
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
  const rows = readRows(text.replace(/^﻿/, ""));
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
  return { solves, skipped };
}

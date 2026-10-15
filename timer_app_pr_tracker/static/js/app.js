// The page: read a file in a worker, then chart each puzzle's records. Nothing is sent anywhere.
import { formatDay, formatTime, skippedSummary } from "./format.js";

const fileInput = document.getElementById("file");
const statusLine = document.getElementById("status");
const skippedLine = document.getElementById("skipped");
const results = document.getElementById("results");
const puzzleSelect = document.getElementById("puzzle");
const chartsBox = document.getElementById("charts");

const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
let latestRequest = 0;
let entries = [];
let charts = [];

function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function currentAxis() {
  return document.querySelector('input[name="axis"]:checked').value;
}

function describe(point, axis) {
  return axis === "date" ? `on ${formatDay(point.x)}` : `at solve ${point.x}`;
}

function drawChart(series, axis) {
  const figure = document.createElement("figure");
  const box = document.createElement("div");
  box.className = "chart";
  const canvas = document.createElement("canvas");
  box.append(canvas);
  const caption = document.createElement("figcaption");
  const best = series.points.at(-1);
  caption.textContent = `${series.label}: best ${formatTime(best.y)} (${describe(best, axis)})`;
  figure.append(box, caption);
  chartsBox.append(figure);

  charts.push(
    new Chart(canvas, {
      type: "line",
      data: {
        datasets: [
          {
            label: series.label,
            data: series.points,
            stepped: "after",
            borderColor: "#2563eb",
            backgroundColor: "#2563eb",
            borderWidth: 2,
            pointRadius: 3,
          },
        ],
      },
      options: {
        animation: false,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ([item]) => (axis === "date" ? formatDay(item.parsed.x) : `Solve ${item.parsed.x}`),
              label: (item) => formatTime(item.parsed.y),
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: axis === "date" ? "Date" : "Solve number" },
            ticks: { callback: (value) => (axis === "date" ? formatDay(value) : value) },
          },
          y: {
            title: { display: true, text: "Time" },
            ticks: { callback: (value) => formatTime(value) },
          },
        },
      },
    }),
  );
}

function showCharts() {
  for (const chart of charts) chart.destroy();
  charts = [];
  chartsBox.replaceChildren();

  const entry = entries[puzzleSelect.selectedIndex];
  const axis = currentAxis();
  const lines = entry.series[axis];
  if (lines.length === 0) {
    const none = document.createElement("p");
    none.textContent = "No records yet for this puzzle.";
    chartsBox.append(none);
    return;
  }
  for (const series of lines) drawChart(series, axis);
}

function showResults({ entries: found, skipped }, fileName) {
  entries = found;
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  statusLine.textContent = `Read ${plural(total, "solve")} from ${fileName}.`;

  const summary = skippedSummary(skipped);
  skippedLine.textContent = summary;
  skippedLine.hidden = summary === "";

  puzzleSelect.replaceChildren(
    ...entries.map((entry, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${entry.label} (${plural(entry.count, "solve")})`;
      return option;
    }),
  );
  results.hidden = entries.length === 0;
  if (entries.length > 0) showCharts();
}

function showProblem(message) {
  statusLine.textContent = message;
  skippedLine.hidden = true;
  results.hidden = true;
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  latestRequest += 1;
  const id = latestRequest;
  results.hidden = true;
  skippedLine.hidden = true;
  statusLine.textContent = `Reading ${file.name}…`;

  const text = await file.text();
  worker.onmessage = ({ data }) => {
    if (data.id !== latestRequest) return;
    if (data.error) showProblem(data.error);
    else showResults(data.analysis, file.name);
  };
  worker.onerror = () => showProblem("Something went wrong while reading that file.");
  worker.postMessage({ id, text });
});

puzzleSelect.addEventListener("change", showCharts);
for (const radio of document.querySelectorAll('input[name="axis"]')) {
  radio.addEventListener("change", showCharts);
}

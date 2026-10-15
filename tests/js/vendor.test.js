// The page serves a vendored copy of Chart.js (there is no build step). It must be exactly the file
// the pinned npm package ships, so a hand edit or a version bump that forgot the copy is caught.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(new URL(path, import.meta.url));

describe("vendored Chart.js", () => {
  it("is byte-for-byte the file in the pinned chart.js package", () => {
    const vendored = read("../../timer_app_pr_tracker/static/vendor/chart.umd.js");
    const installed = read("../../node_modules/chart.js/dist/chart.umd.js");

    expect(vendored.equals(installed)).toBe(true);
  });
});

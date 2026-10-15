// Reads the file off the page's thread, so a large export doesn't freeze the page.
import { analyseCubicTimer } from "./analysis.js";

self.addEventListener("message", ({ data: { id, text } }) => {
  try {
    self.postMessage({ id, analysis: analyseCubicTimer(text) });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
});

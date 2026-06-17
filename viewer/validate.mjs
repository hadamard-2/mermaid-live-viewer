// Offline syntax check for a mermaid .mmd file, using the SAME parser the viewer
// loads (mermaid@11). Catches the errors that otherwise only surface in the
// browser on refresh: bad arrows, unclosed brackets, a `;` inside a label/note
// (read as a statement separator), etc.
//
//   bun  ~/diagrams/validate.mjs <file.mmd>
//   node ~/diagrams/validate.mjs <file.mmd>
//
// Prints "OK: <file>" and exits 0, or the parser error and exits 1 (2 = usage /
// missing file). The file path is resolved relative to the current directory, so
// `cd ~/diagrams && bun validate.mjs <project>/<name>.mmd` works.
//
// Validates GRAMMAR only (mermaid.parse) — not layout/render. Every parse error
// we've hit is caught here. Deps (mermaid + jsdom) live next to this file; see
// viewer/package.json and install.sh.

import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const file = process.argv[2];
if (!file) {
  console.error("usage: validate.mjs <file.mmd>");
  process.exit(2);
}

let text;
try {
  text = readFileSync(file, "utf8");
} catch {
  console.error(`cannot read file: ${file}`);
  process.exit(2);
}

// mermaid touches the DOM on import; give it a minimal one.
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
try {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  // navigator already present in this runtime — fine.
}

const { default: mermaid } = await import("mermaid");
mermaid.initialize({ startOnLoad: false });

try {
  await mermaid.parse(text); // throws on syntax error
  console.log(`OK: ${file}`);
} catch (e) {
  console.error(`SYNTAX ERROR in ${file}:\n${e?.message ?? e}`);
  process.exit(1);
}

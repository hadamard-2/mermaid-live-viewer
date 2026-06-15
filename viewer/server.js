// Live mermaid viewer server. Run with: bun server.js
// Serves index.html and pushes diagram file changes over SSE (no polling).
//
// Layout it expects:
//   ~/diagrams/index.html          <- the viewer (served at /)
//   ~/diagrams/server.js           <- this file
//   ~/diagrams/<project>/<name>.mmd <- diagrams
//
// Open a diagram at:  http://localhost:4242/?file=<project>/<name>.mmd

import { watch } from "fs";
import { readFile } from "fs/promises";
import { dirname, basename, join, resolve, sep, extname } from "path";

const ROOT = process.env.DIAGRAMS_ROOT || join(process.env.HOME, "diagrams");
const PORT = Number(process.env.PORT || 4242);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mmd": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

// Resolve a user-supplied path and refuse anything that escapes ROOT.
function safeResolve(rel) {
  if (!rel) return null;
  const abs = resolve(ROOT, "." + sep + rel);
  if (abs !== ROOT && !abs.startsWith(ROOT + sep)) return null; // path traversal guard
  return abs;
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // --- SSE stream of a single diagram's contents ---
    if (url.pathname === "/events") {
      const abs = safeResolve(url.searchParams.get("file"));
      if (!abs) return new Response("bad file param", { status: 400 });

      const enc = new TextEncoder();
      let watcher, debounce, beat;
      const target = basename(abs);

      const stream = new ReadableStream({
        start(controller) {
          let closed = false;
          const write = (s) => { if (!closed) controller.enqueue(enc.encode(s)); };
          const push = async () => {
            let content = "", missing = false;
            try { content = await readFile(abs, "utf8"); }
            catch { missing = true; }
            write(`data: ${JSON.stringify({ content, missing })}\n\n`);
          };

          push();
          try {
            watcher = watch(dirname(abs), (_e, fn) => {
              if (fn && fn !== target) return;
              clearTimeout(debounce);
              debounce = setTimeout(push, 50);
            });
          } catch {}
          beat = setInterval(() => write(`: ping\n\n`), 20000);

          req.signal.addEventListener("abort", () => {
            closed = true;
            clearTimeout(debounce);
            clearInterval(beat);
            watcher?.close();
            try { controller.close(); } catch {}
          });
        },
      });

      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
      });
    }

    // --- static files under ROOT ---
    const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const abs = safeResolve(rel);
    if (!abs) return new Response("forbidden", { status: 403 });

    const file = Bun.file(abs);
    if (!(await file.exists())) return new Response("not found", { status: 404 });

    const type = TYPES[extname(abs).toLowerCase()];
    return new Response(file, type ? { headers: { "content-type": type } } : undefined);
  },
});

console.log(`mermaid viewer  ->  http://localhost:${PORT}   (root: ${ROOT})`);

---
name: visual-explainer
description: >-
  Render a mermaid diagram and show it live in the browser whenever the user
  asks to understand or see something visually, to explain architecture, flows,
  state, relationships, or sequences, or to "draw / diagram / visualize / map
  out" anything about the current project. Use this proactively for any request
  where a diagram would explain a concept better than prose. Diagrams are served
  from ~/diagrams and update instantly on every edit.
---

# Visual explainer

Turn an explanation into a live mermaid diagram the user views in their browser. Diagrams live in `~/diagrams`, never in the user's project repo (unless they explicitly ask to save one into the repo's docs).

## Conventions

- Project folder: `~/diagrams/<project>/` where `<project>` is the basename of the current working directory.
- Diagram file: `<meaningful-name>-<timestamp>.mmd` (timestamp from `date +%Y%m%d-%H%M%S`, e.g. `auth-flow-20260615-143022.mmd`).
- Viewer URL: `http://localhost:4242/?file=<project>/<name>-<timestamp>.mmd`

## Steps

1. Ensure the viewer server is running (idempotent — only starts it once):

   ```bash
   curl -sf -o /dev/null http://localhost:4242/ \
     || ( cd ~/diagrams && nohup bun server.js >/tmp/diagram-viewer.log 2>&1 & )
   ```

2. Create the project folder and write the diagram:

   ```bash
   proj=$(basename "$PWD")
   mkdir -p ~/diagrams/"$proj"
   ts=$(date +%Y%m%d-%H%M%S)
   # write valid mermaid to ~/diagrams/$proj/<name>-$ts.mmd
   ```

3. Give the user the URL to open: `http://localhost:4242/?file=<proj>/<name>-<ts>.mmd` (Only the first diagram needs a fresh tab; later edits update in place.)

## Styling — do NOT color diagrams yourself

The viewer owns all appearance (dark transparent theme, rounded corners, line colors). Write **structure only**: nodes, edges, subgraphs, labels. Do **not** emit `classDef`, `style`, `fill:`, `stroke:`, or any hex colors — they fight the theme and look worse.

To convey meaning through color, tag nodes and subgraphs with these predefined classes (the viewer colors them). Untagged nodes get a clean neutral default, so tagging is optional — only do it when color genuinely helps.

Two have fixed meaning across all diagrams:
- `muted` — infrastructure, plumbing, or de-emphasized nodes (recedes, grey)
- `danger` — error states, failure paths, the bad branch (warm red)

Three are abstract slots you map to whatever this diagram's categories are:
- `category-a`, `category-b`, `category-c` — distinct hues, no fixed meaning

Group the nodes into at most three categories and assign each to a `category-*` slot. Examples: schema → tables `category-a`, views `category-b`; pipeline → sources `category-a`, transforms `category-b`, sinks `category-c`.

```
class users,posts,comments category-a;
class user_view,post_feed category-b;
class cache,queue muted;
class dead_letter danger;
```

Only use these five class names. Never invent new ones, and never attach colors.

## Iterating

When the user asks to add, remove, or change parts of the diagram you just made, **edit the same `.mmd` file in place**. The open tab re-renders instantly over SSE — do not create a new file or a new URL. Only start a new file for a genuinely different diagram.

If the user says the viewer shows an error, the mermaid syntax is invalid; fix the `.mmd` and the error clears on its own.

## Setup (one time, if missing)

This skill needs `~/diagrams/server.js` and `~/diagrams/index.html` to exist and `bun` on PATH. If `curl` to `localhost:4242` fails and the server won't start, check `/tmp/diagram-viewer.log`.

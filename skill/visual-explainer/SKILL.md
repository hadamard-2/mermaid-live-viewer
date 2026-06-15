---
name: visual-explainer
description: >-
    Render a mermaid diagram and show it live in the browser whenever the user
    asks to understand or see something visually, to explain architecture, flows,
    state, relationships, or sequences, or to "draw / diagram / visualize / map
    out" anything about the current project. Use this proactively for any request
    where a diagram would explain a concept better than prose. Before drawing, ask
    a short batch of multiple-choice questions to pin down what the user actually
    needs. Diagrams are served from ~/diagrams and update instantly on every edit.
---

# Visual explainer

Turn an explanation into a live mermaid diagram the user views in their browser. Diagrams live in `~/diagrams`, never in the user's project repo (unless they explicitly ask to save one into the repo's docs).

The flow is always: find the real question, then build, then iterate. Do not draw immediately.

## Conventions

- Project folder: `~/diagrams/<project>/` where `<project>` is the basename of the current working directory.
- Diagram file: `<meaningful-name>-<timestamp>.mmd` (timestamp from `date +%Y%m%d-%H%M%S`, e.g. `auth-flow-20260615-143022.mmd`).
- Viewer URL: `http://localhost:4242/?file=<project>/<name>-<timestamp>.mmd`

## Step 1 — Find the real question (do this before drawing)

A diagram only helps if it answers the user's actual confusion. Most requests are under-specified, and the wrong form (defaulting to a flowchart) is the most common failure. So orient, ask, then build.

1. **Orient quietly first.** Skim the relevant code so your questions and their options are concrete to _this_ subject. Name real modules, components, and functions. Generic options are much weaker than ones built from what you just read.

2. **Ask a short batch of multiple-choice questions in ONE message.** Two to four questions, scaled to how ambiguous the request is. Rules:
    - Frame every question around what the user is trying to _understand_, never around diagram-type names. Ask "the order things happen at runtime, or how the pieces are wired together?" not "sequence or flowchart?". The user names their confusion; you choose the form.
    - Make the options concrete to the subject, using the actual names from the code.
    - The **last option of every question is open-ended**: `Something else: ___`, so the user can correct you when none of the options fit.

    Angles to cover (pick the ones that are actually ambiguous):
    - **Kind of gap** (this silently selects the form):
        ```
        What about <X> is unclear?
          A. What the pieces are and how data flows between them
          B. The order things happen at runtime, step by step
          C. The states it moves through and what triggers each change
          D. The data model: what entities exist and how they relate
          E. Something else: ___
        ```
    - **Scope:** the whole `<X>`, or one specific part? (Name the candidate parts.)
    - **Depth:** a high-level overview, or down to implementation detail?

3. **Map the answers to a form** using the table below, then build. Never surface the diagram-type name to the user; it is your internal decision.

### Confusion → form (internal mapping, do not show the user)

| What the user is trying to understand               | Mermaid form                    |
| --------------------------------------------------- | ------------------------------- |
| What the parts are and how they connect / data flow | `flowchart`                     |
| Whole-system architecture and boundaries            | `architecture` / C4 style       |
| The order of interactions at runtime                | `sequenceDiagram`               |
| The states something moves through and transitions  | `stateDiagram-v2`               |
| The data model: entities and relationships          | `erDiagram`                     |
| Class / type structure (OO)                         | `classDiagram`                  |
| Branching control logic / decisions                 | `flowchart` with decision nodes |
| How something evolved over time / history           | `gitGraph` or `timeline`        |
| Schedule or phases over time                        | `gantt`                         |

If the request is genuinely unambiguous (e.g. "diagram the auth handshake" is plainly a runtime sequence), you may skip the questions and build directly. When in doubt, ask.

## Step 2 — Build

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
    # write the .mmd (chosen form, structure only) to ~/diagrams/$proj/<name>-$ts.mmd
    ```

3. Give the user the URL to open:
   `http://localhost:4242/?file=<proj>/<name>-<ts>.mmd`
   (Only the first diagram needs a fresh tab; later edits update in place.)

## Styling — do NOT color diagrams yourself

The viewer owns all appearance (dark transparent theme, rounded corners, line colors). Write **structure only**: nodes, edges, subgraphs, labels. Do **not** emit `classDef`, `style`, `fill:`, `stroke:`, or any hex colors. They fight the theme and look worse.

To convey meaning through color, tag nodes and subgraphs with these predefined classes (the viewer colors them). Untagged nodes get a clean neutral default, so tagging is optional. Only tag when color genuinely helps.

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

When the user asks to add, remove, or change parts of the diagram you just made, **edit the same `.mmd` file in place**. The open tab re-renders instantly over SSE. Do not create a new file or a new URL. Only start a new file for a genuinely different diagram.

You cannot reposition individual boxes; the layout is computed by ELK from the structure. To reshape a diagram, change the inputs the layout is computed from: flip the direction (`TD` ↔ `LR`), group related nodes into subgraphs, reorder edge declarations, add an invisible edge (`A ~~~ B`) to hint ordering, or adjust ELK spacing. If a user asks to move a specific box, translate it into one of these structural changes.

If the user says the viewer shows an error, the mermaid syntax is invalid; fix the `.mmd` and the error clears on its own.

## Setup (one time, if missing)

This skill needs `~/diagrams/server.js` and `~/diagrams/index.html` to exist and `bun` on PATH. If `curl` to `localhost:4242` fails and the server won't start, check `/tmp/diagram-viewer.log`.

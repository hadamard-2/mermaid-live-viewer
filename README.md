# Mermaid Live Viewer

A tiny local tool that renders [mermaid](https://mermaid.js.org/) diagrams in your browser and live-reloads them the instant the source file changes. It is built to pair with [Claude Code](https://docs.claude.com/en/docs/claude-code): you ask Claude Code to explain something visually, it writes a `.mmd` file, and a themed diagram appears in a browser tab that updates on every edit. No polling, no build step, one runtime dependency (bun).

## How it works

Three small pieces, with one rule between them: the viewer owns all *appearance*, and diagram files carry only *structure*.

- `viewer/server.js` is a [bun](https://bun.sh/) HTTP server rooted at `~/diagrams`. It serves the viewer page and exposes a Server-Sent Events stream per diagram. It watches the diagram's directory and pushes the new contents the moment the file changes. It watches the directory rather than the file so it survives editors that save by writing a temp file and renaming, and it debounces duplicate filesystem events so one save triggers one render.
- `viewer/index.html` is the viewer. It opens an `EventSource` to the server, renders the pushed text with a customized mermaid theme, and re-renders on every push. It has drag-to-pan, wheel-zoom (toward the cursor), a live connection indicator, and an error overlay that keeps the last good diagram on screen when the syntax breaks. All theming lives here in one place, so every diagram looks consistent and you can restyle them all by editing one file.
- `skill/visual-explainer/SKILL.md` is a Claude Code skill. It tells Claude Code where to put diagrams, how to name them, to start the server if it is not already running, and (importantly) to write structure only and never hardcode colors.

The browser loads mermaid and the ELK layout engine from a CDN, so the only thing you install locally is bun.

## Prerequisites

- [bun](https://bun.sh/) on your `PATH`
- A modern browser with network access (mermaid and ELK load from the jsDelivr CDN)
- Optional: Claude Code, for the skill-driven workflow. The viewer works fine on its own with hand-written `.mmd` files.

## Install

Clone the repo somewhere that is **not** `~/diagrams` (the install script links into `~/diagrams` for you, and keeping the repo separate stops your generated diagrams from mixing with version-controlled files):

```sh
git clone https://github.com/hadamard-2/mermaid-live-viewer.git
cd mermaid-live-viewer
./install.sh
```

`install.sh` symlinks `viewer/index.html` and `viewer/server.js` into `~/diagrams`, and `skill/visual-explainer` into `~/.claude/skills`. Because these are symlinks, a later `git pull` updates the live setup with no extra step. If a real (non-symlink) file already exists at one of those paths, it is backed up rather than overwritten.

Then add the shell helper (recommended):

```sh
echo "source $(pwd)/shell/diagrams.zsh" >> ~/.zshrc
source ~/.zshrc
```

## Usage

Start the server from anywhere:

```sh
diagrams start          # or, without the helper: bun ~/diagrams/server.js
```

With Claude Code, from inside any project, ask for a visual explanation ("explain this module's request flow", "diagram the auth handshake"). Claude Code writes `~/diagrams/<project>/<name>-<timestamp>.mmd` and hands you a URL like `http://localhost:4242/?file=<project>/<name>-<timestamp>.mmd`. Open it once; from then on, asking Claude Code to change the diagram edits the same file and the tab updates on its own.

You can also just write a `.mmd` by hand under `~/diagrams/` and open it with the same URL shape.

Viewer controls: drag to pan, scroll to zoom toward the cursor, `+` / `-` / `0` for zoom in / out / fit. Once you pan or zoom, live edits keep your framing instead of snapping back.

## Color vocabulary

Diagrams convey meaning through a fixed set of class names; the viewer decides what each one looks like. Tag a node or subgraph with `class <ids> <name>`. Untagged nodes get a clean neutral default, so tagging is optional.

Two classes carry fixed meaning across every diagram:

- `muted`: infrastructure, plumbing, or de-emphasized nodes. Recedes (grey).
- `danger`: error states, failure paths, the bad branch. Warm red.

Three are abstract slots that mean whatever a given diagram needs:

- `category-a`, `category-b`, `category-c`: three distinct hues, no fixed meaning.

For example, a schema diagram might map tables to `category-a` and views to `category-b`; a data pipeline might use `category-a` for sources, `category-b` for transforms, `category-c` for sinks. The vocabulary is fixed but the meaning floats free, so the same five names cover any diagram type.

To restyle everything, edit the `CATEGORY_CSS` block in `viewer/index.html`. Every existing diagram re-renders with the new look the next time you open it; you never touch the `.mmd` files.

## Server control

With the shell helper sourced:

```sh
diagrams start      # start if not already running (idempotent)
diagrams stop       # stop whatever is listening on the port
diagrams restart
diagrams status
diagrams logs       # tail the server log
diagrams open       # open the viewer in your browser
```

It keys off the port, not a saved process id, so `stop` and `status` work even when Claude Code was the one that launched the server through the skill.

## Configuration

The server reads two environment variables:

- `PORT`: the port to listen on. Default `4242`.
- `DIAGRAMS_ROOT`: the directory to serve and watch. Default `~/diagrams`.

The shell helper reads `DIAGRAMS_PORT` and `DIAGRAMS_DIR` for the same purposes. Set them before sourcing the helper if you want non-default values.

## Troubleshooting

- **Nothing renders / blank diagram.** The browser could not reach the CDN. Check that it can load `cdn.jsdelivr.net`. The server log lives at `${TMPDIR:-/tmp}/diagram-viewer.log`.
- **Server will not start.** Confirm `bun` is on your `PATH` (`which bun`).
- **ELK import fails.** The ELK layout package is published at major version `0`, not `11`. The import in `index.html` correctly pins `@mermaid-js/layout-elk@0`; do not change it to `@11`, which does not exist.
- **Subgraph title colors look wrong while the boxes look right.** The selectors for subgraph (cluster) labels target mermaid's internal markup, which shifts occasionally between versions. Adjust the `.cluster.<name> .nodeLabel` rules in the `CATEGORY_CSS` block if a mermaid upgrade moves them.
- **A diagram looks cramped or tangled.** That is usually a structure problem (too many ungrouped nodes), not a theme problem. Group related nodes into subgraphs, or tune ELK spacing with an `elk` config block in the diagram or in `initialize`.

## License

MIT. See `LICENSE`.

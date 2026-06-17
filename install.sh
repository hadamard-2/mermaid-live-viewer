#!/usr/bin/env bash
# Symlinks the viewer into ~/diagrams and the skill into ~/.claude/skills.
# Symlinks (not copies) so a future `git pull` updates everything in place.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIAGRAMS_DIR="${DIAGRAMS_DIR:-$HOME/diagrams}"
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

link() { # link <target> <linkname>
  local target="$1" link="$2"
  if [[ -e "$link" && ! -L "$link" ]]; then
    mv "$link" "$link.bak.$(date +%s)"
    echo "  backed up existing $link"
  fi
  ln -sfn "$target" "$link"
  echo "  linked $link"
}

echo "installing mermaid-live-viewer from $REPO_DIR"
mkdir -p "$DIAGRAMS_DIR" "$SKILLS_DIR"
link "$REPO_DIR/viewer/index.html"       "$DIAGRAMS_DIR/index.html"
link "$REPO_DIR/viewer/server.js"        "$DIAGRAMS_DIR/server.js"
link "$REPO_DIR/viewer/validate.mjs"     "$DIAGRAMS_DIR/validate.mjs"
link "$REPO_DIR/skill/visual-explainer"  "$SKILLS_DIR/visual-explainer"

# Deps for the offline .mmd validator (mermaid + jsdom), installed next to the
# real validate.mjs so it resolves them through the symlink. The viewer's
# server.js needs none of this.
echo "installing validator deps in viewer/"
if command -v bun >/dev/null; then
  ( cd "$REPO_DIR/viewer" && bun install )
elif command -v npm >/dev/null; then
  npm install --prefix "$REPO_DIR/viewer"
else
  echo "  note: no bun/npm on PATH — run 'bun install' in $REPO_DIR/viewer to enable validation"
fi

echo
echo "done. next steps:"
echo "  1. shell helper:  echo \"source $REPO_DIR/shell/diagrams.zsh\" >> ~/.zshrc && source ~/.zshrc"
echo "  2. start it:      diagrams start    (or: bun $DIAGRAMS_DIR/server.js)"
command -v bun >/dev/null || echo "  note: bun is not on PATH yet. install it: https://bun.sh"

#!/bin/bash
# Copies Claude Code memory files from the repo into your local Claude data directory.
# Run this once after cloning on a new machine, and again after any session
# where new memories were saved (to keep the repo in sync).
#
# Usage:
#   Load into Claude:     bash setup-claude-memory.sh
#   Save back to repo:    bash setup-claude-memory.sh --save

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMORY_SRC="$SCRIPT_DIR/_claude-memory"
CLAUDE_DIR="$HOME/.claude"

# Claude Code derives the memory folder name by replacing every non-alphanumeric
# character in the project path with a dash.
encode_path() {
  echo "$1" | sed 's/[^a-zA-Z0-9]/-/g'
}

# The memory key is whichever directory you open in your IDE. Try both the
# repo root and its parent (in case you opened the parent workspace folder).
REPO_PATH="$SCRIPT_DIR"
PARENT_PATH="$(dirname "$SCRIPT_DIR")"

MEMORY_DEST=""
for PATH_CANDIDATE in "$REPO_PATH" "$PARENT_PATH"; do
  ENCODED=$(encode_path "$PATH_CANDIDATE")
  CANDIDATE="$CLAUDE_DIR/projects/$ENCODED/memory"
  if [ -d "$CANDIDATE" ]; then
    MEMORY_DEST="$CANDIDATE"
    break
  fi
done

# If neither exists yet, default to the repo root encoding
if [ -z "$MEMORY_DEST" ]; then
  MEMORY_DEST="$CLAUDE_DIR/projects/$(encode_path "$REPO_PATH")/memory"
fi

if [ "$1" == "--save" ]; then
  echo "Saving local Claude memory → repo (_claude-memory/)..."
  mkdir -p "$MEMORY_SRC"
  cp "$MEMORY_DEST/"*.md "$MEMORY_SRC/"
  echo "✓ Done. Review changes, then: git add _claude-memory/ && git commit && git push"
else
  echo "Installing Claude Code memory..."
  echo "  Source:      $MEMORY_SRC"
  echo "  Destination: $MEMORY_DEST"
  echo ""
  mkdir -p "$MEMORY_DEST"
  cp "$MEMORY_SRC/"*.md "$MEMORY_DEST/"
  echo "✓ Memory files installed. Open the project in Claude Code and they'll be active."
fi

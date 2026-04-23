---
name: Cross-platform setup
description: User works on both Mac and Windows PC — may switch machines mid-project
type: user
---

User works across a Mac (primary, current) and a Windows PC. When continuing work on the PC, the same Claude Code memory applies — the `_claude-memory/` folder in the repo root is the source of truth and is kept in sync via GitHub.

**Why:** User asked to set this up so context (bug log, feedback, pricing, backlog, etc.) is available on any machine without manually copying `~/.claude`.

**How to apply:** If user mentions switching to PC or starting a new session on a different machine, remind them to run the setup script (`setup-claude-memory.sh` on Mac/Linux, `setup-claude-memory.ps1` on Windows) after cloning the repo, and to run it again after any session where new memories were saved.

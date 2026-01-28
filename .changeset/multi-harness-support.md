---
"agent-worklog": minor
---

Add multi-harness support for AI coding tools

- Support Claude Code, Cursor, OpenAI Codex, OpenCode, and universal AGENTS.md format
- Auto-detect installed tools and install to all detected harnesses
- Add `--harness <name>` option for explicit harness selection
- Add `AW_SESSION_ID` environment variable as fallback for session correlation

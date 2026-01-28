# agent-worklog

## 0.4.0

### Minor Changes

- 853cced: Add multi-harness support for AI coding tools

  - Support Claude Code, Cursor, OpenAI Codex, OpenCode, and universal AGENTS.md format
  - Auto-detect installed tools and install to all detected harnesses
  - Add `--harness <name>` option for explicit harness selection
  - Add `AW_SESSION_ID` environment variable as fallback for session correlation

## 0.3.0

### Minor Changes

- Add uninstall command and research category

  - Added `aw uninstall` command to remove Claude Code integration (supports both `--global` and local modes)
  - Added `research` as a new task category for logging investigation findings and technical analysis
  - Updated skill instructions to clarify when to log research findings vs exploration without conclusions

## 0.2.1

### Patch Changes

- Move webapp dependencies (Next.js, React, etc.) to devDependencies

  The CLI only needs commander, drizzle-orm, better-sqlite3, and claude-agent-sdk.
  Next.js and React are only needed for local webapp development and Vercel deployment.

## 0.2.0

### Minor Changes

- Add UserPromptSubmit hook integration for persistent worklog reminders

  - Added `aw hooks remind` command that outputs JSON for Claude Code hooks
  - Simplified CLAUDE.md instructions (reduced from ~130 to ~20 lines)
  - `aw install` now configures UserPromptSubmit hook in settings.json
  - Removed external shell script dependency - CLI handles everything

## 0.1.0

### Minor Changes

- Initial release of Agent Work Log CLI

  - `aw task` - Log completed work with categories and automatic metadata collection
  - `aw summary` - Generate AI-powered summaries with timeframe and filter options
  - `aw web` - Launch web interface for browsing logs with filters and AI summaries
  - `aw install` - Set up Claude Code integration with skills and CLAUDE.md instructions
  - SQLite database storage in `~/.aw/worklog.db`
  - Automatic metadata: project name, git branch, working directory, session ID

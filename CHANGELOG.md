# agent-worklog

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

# Agent Work Log

A CLI tool for AI agents to track their work activities in a centralized SQLite database, with a web interface for browsing and AI-powered summaries.

## Features

- **Simple CLI**: Log tasks with `aw task`
- **AI Summaries**: Generate summaries with `aw summary`
- **Web Interface**: Browse logs visually with `aw web`
- **Persistent Storage**: SQLite database in `~/.aw/worklog.db`
- **Automatic Metadata**: Captures project name, git branch, working directory
- **Claude Code Integration**: Includes skills and instructions for seamless agent integration

## Installation

```bash
pnpm install
pnpm link --global
```

## Commands

### `aw task`

Log a completed task:

```bash
aw task "Implemented JWT authentication" --category feature
aw task "Fixed race condition in db pooling" -c bugfix
```

**Options:**
- `-c, --category <category>` — Category (feature, bugfix, refactor, docs, config, test, perf, infra, security, or custom)

### `aw summary`

Generate an AI summary of work entries:

```bash
aw summary                          # Last 7 days
aw summary -d 30                    # Last 30 days
aw summary --project my-app         # Filter by project
aw summary -c feature -d 14         # Features from last 2 weeks
aw summary --json                   # Machine-readable output
```

**Options:**
- `-d, --days <number>` — Days to look back (default: 7)
- `-c, --category <category>` — Filter by category
- `-p, --project <project>` — Filter by project name
- `--json` — Output raw JSON

### `aw web`

Start the web interface:

```bash
aw web                  # Start on port 3000
aw web -p 8080          # Custom port
```

**Options:**
- `-p, --port <number>` — Port to run on (default: 3000)

### `aw install`

Install Claude Code integration:

```bash
aw install --global     # Install to ~/.claude/ (recommended)
aw install              # Install to ./.claude/ (project-specific)
```

This sets up:
- Skill definition guiding agents on when/how to log work
- CLAUDE.md instructions for work logging
- Automatic permission grants for the `aw` command

## Database

**Location:** `~/.aw/worklog.db`

**Schema:**
| Column | Description |
|--------|-------------|
| `id` | Auto-incrementing primary key |
| `timestamp` | ISO 8601 timestamp |
| `task_description` | Description of the work |
| `category` | Work category |
| `session_id` | Claude session ID (from `CLAUDE_SESSION_ID` env var) |
| `project_name` | Auto-detected from git or directory |
| `git_branch` | Current git branch |
| `working_directory` | Directory where command was run |

**Query examples:**

```bash
# Recent entries
sqlite3 ~/.aw/worklog.db "SELECT * FROM work_entries ORDER BY created_at DESC LIMIT 10;"

# By category
sqlite3 ~/.aw/worklog.db "SELECT task_description FROM work_entries WHERE category='feature';"

# By project
sqlite3 ~/.aw/worklog.db "SELECT task_description FROM work_entries WHERE project_name='my-app';"
```

## Session Tracking

Set `CLAUDE_SESSION_ID` to correlate entries from a single session:

```bash
export CLAUDE_SESSION_ID="session-abc123"
aw task "Implemented auth" --category feature
aw task "Fixed login bug" --category bugfix
# Both tagged with same session_id
```

## Development

```bash
pnpm cli task "Test entry" -c test   # Run CLI locally
pnpm dev                              # Run web app in dev mode
pnpm test                             # Run tests
pnpm db:studio                        # Visual database browser
pnpm db:generate                      # Generate migration after schema changes
```

## Tech Stack

- **CLI**: TypeScript, Commander.js, tsx
- **Database**: SQLite via better-sqlite3, Drizzle ORM
- **Web**: Next.js, React, Radix UI, Tailwind CSS
- **AI**: Claude Agent SDK for summaries

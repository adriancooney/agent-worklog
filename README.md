# Agent Work Log

A CLI tool for AI agents to track their work activities in a centralized SQLite database.

## Features

- **Simple CLI**: Log tasks with a single command
- **Persistent Storage**: SQLite database in `~/.aw/worklog.db`
- **Automatic Timestamps**: ISO 8601 format timestamps added automatically
- **Global Access**: Works from any directory after installation
- **Claude Code Integration**: Includes a skill for seamless agent integration

## Installation

Install dependencies and link globally:

```bash
pnpm install
pnpm link --global
```

This makes the `aw` command available globally from any directory.

## Usage

Log a completed task with a category:

```bash
aw task "Implemented JWT authentication with refresh tokens" --category feature
```

The command will:
1. Generate an ISO 8601 timestamp
2. Collect metadata (project name, git branch, working directory)
3. Store the entry in `~/.aw/worklog.db`
4. Display confirmation: `✓ Logged: <description> [category]`

### Categories

Use `--category` (or `-c`) to categorize work:

- `feature` - New functionality or capabilities
- `bugfix` - Fixed defects or issues
- `refactor` - Code restructuring without behavior change
- `docs` - Documentation updates
- `config` - Build, deployment, or infrastructure setup
- `test` - Test additions or improvements
- `perf` - Performance optimizations
- `infra` - Infrastructure or tooling changes
- `security` - Security improvements or fixes

### Session Tracking

Set the `CLAUDE_SESSION_ID` environment variable to correlate all work from a Claude session:

```bash
export CLAUDE_SESSION_ID="session-2026-01-19-abc123"
aw task "Implemented user authentication" --category feature
aw task "Fixed login validation bug" --category bugfix
# Both entries will be tagged with the same session_id
```

## Database

- **Location**: `~/.aw/worklog.db`
- **Schema**:
  - `id`: Auto-incrementing primary key
  - `timestamp`: ISO 8601 timestamp (when logged)
  - `task_description`: Text description of the work
  - `session_id`: Claude session identifier (from env var, nullable)
  - `category`: Work category (feature, bugfix, etc., nullable)
  - `project_name`: Auto-detected from git repo or directory name
  - `git_branch`: Auto-detected current branch (nullable)
  - `working_directory`: Directory where command was run
  - `created_at`: Unix timestamp (database insertion time)

Query the database directly:

```bash
# View recent entries
sqlite3 ~/.aw/worklog.db "SELECT * FROM work_entries ORDER BY created_at DESC LIMIT 10;"

# Filter by category
sqlite3 ~/.aw/worklog.db "SELECT task_description, category FROM work_entries WHERE category='feature';"

# View entries by project
sqlite3 ~/.aw/worklog.db "SELECT task_description, git_branch FROM work_entries WHERE project_name='agent-worklog';"

# View entries from a session
sqlite3 ~/.aw/worklog.db "SELECT * FROM work_entries WHERE session_id='session-123' ORDER BY created_at;"
```

## Database Management

This project uses [Drizzle ORM](https://orm.drizzle.team/) with DrizzleKit for type-safe database operations and migrations.

### Migrations

Migrations are automatically applied when the CLI runs. The migration files are located in the `drizzle/` directory.

To generate a new migration after schema changes:

```bash
pnpm db:generate
```

To view and manage the database visually:

```bash
pnpm db:studio
```

### Schema

The database schema is defined in `src/schema.ts` using Drizzle ORM. Any changes to the schema should be followed by generating a new migration.

## Development

Run the CLI locally without global installation:

```bash
pnpm cli task "Test entry" --category test
```

Run tests:

```bash
pnpm test
```

## Metadata Auto-Detection

The CLI automatically collects contextual information:

- **Project Name**: Extracted from git remote URL, or falls back to directory name
- **Git Branch**: Current branch name (if in a git repository)
- **Working Directory**: Full path where the command was executed
- **Session ID**: From `CLAUDE_SESSION_ID` environment variable (optional)

This metadata is stored with each entry for filtering and analysis.

## Claude Code Skill

This project includes a Claude Code skill in `skills/worklog/SKILL.md` that guides agents on when and how to log work. See `CLAUDE.md` for detailed agent instructions.

## Next.js Application

This project also includes a [Next.js](https://nextjs.org) application bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

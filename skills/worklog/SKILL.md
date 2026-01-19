# Agent Work Log

Log completed work activities to a centralized database for tracking and analysis.

## When to Use

Use the `aw task` command to log work when you complete:

- **Feature implementations**: New functionality, components, or capabilities
- **Bug fixes**: Resolved issues or defects
- **Refactoring**: Significant code reorganization or architectural changes
- **Configuration changes**: Infrastructure, deployment, or build setup
- **Performance improvements**: Optimizations that impact system behavior
- **Documentation**: Meaningful additions to docs, READMEs, or guides

## When NOT to Log

Do not log:

- Reading files or exploring code
- Failed attempts or incomplete work
- Trivial changes (typos, formatting, single-line edits)
- Planning or research activities
- Tool invocations without meaningful outcomes

## Usage

```bash
aw task "description of completed work" --category <category>
```

**Session Tracking**: Set `CLAUDE_SESSION_ID` environment variable at the start of your session to correlate all work from that session.

## Categories

Always include a category to help organize work. Choose from:

- **feature** - New functionality or capabilities
- **bugfix** - Fixed defects or issues
- **refactor** - Code restructuring without behavior change
- **docs** - Documentation updates
- **config** - Build, deployment, or infrastructure setup
- **test** - Test additions or improvements
- **perf** - Performance optimizations
- **infra** - Infrastructure or tooling changes
- **security** - Security improvements or fixes

## Examples

### Good Examples

```bash
aw task "Implemented JWT authentication with refresh tokens" --category feature
aw task "Fixed memory leak in WebSocket connection handler" --category bugfix
aw task "Refactored database layer to use connection pooling" --category refactor
aw task "Added comprehensive error handling to API endpoints" --category feature
aw task "Optimized search query performance by 10x with indexing" --category perf
aw task "Updated API documentation with new endpoints" --category docs
aw task "Added unit tests for authentication module" --category test
aw task "Configured CI/CD pipeline for automated deployments" --category config
```

### Bad Examples

```bash
# Too vague
aw task "Made some changes"

# Not a completion
aw task "Started working on authentication"

# Too trivial
aw task "Fixed typo in variable name"

# Just exploration
aw task "Read the authentication code"
```

## Best Practices

1. **Always specify category**: Use `--category` to categorize the work
2. **Be specific**: Include what was done and what feature/area it affects
3. **Focus on completion**: Only log when work is done, not when starting
4. **One task per log**: Don't combine multiple unrelated accomplishments
5. **Use clear language**: Avoid jargon or overly technical details
6. **Include context**: Mention the relevant technology, component, or system

## Category Selection Guide

When choosing a category:

- **feature** - Added new API endpoint, created new component, implemented new capability
- **bugfix** - Resolved error, fixed incorrect behavior, patched security issue
- **refactor** - Reorganized code structure, improved code quality, extracted functions
- **docs** - Wrote guides, updated README, added code documentation
- **config** - Modified package.json, updated CI config, changed build settings
- **test** - Added unit tests, integration tests, improved test coverage
- **perf** - Optimized queries, reduced memory usage, improved response time
- **infra** - Set up deployment, configured monitoring, added logging
- **security** - Fixed vulnerabilities, added authentication, improved permissions

## Integration

This skill automatically invokes the `aw` CLI tool, which:

- Stores entries in `~/.aw/worklog.db` (SQLite database)
- Adds timestamps automatically (ISO 8601 format)
- Works from any directory (global installation)
- Provides instant feedback on successful logging

## Technical Details

- **Command**: `aw task "<description>" --category <category>`
- **Database**: `~/.aw/worklog.db`
- **Schema**: `work_entries` table with:
  - `id` - Auto-incrementing primary key
  - `timestamp` - ISO 8601 timestamp
  - `task_description` - Description of the work
  - `session_id` - From `CLAUDE_SESSION_ID` env var (nullable)
  - `category` - Work category (nullable)
  - `project_name` - Auto-detected from git repo or directory
  - `git_branch` - Auto-detected current branch (nullable)
  - `working_directory` - Directory where command was run
  - `created_at` - Unix timestamp of database insertion
- **Output**: `✓ Logged: <description> [category]` on success
- **Auto-detection**: Project name, git branch, and working directory are collected automatically

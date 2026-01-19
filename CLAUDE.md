# Agent Work Log - Instructions for AI Agents

This project includes an agent work logging system. When you complete meaningful work, use the `aw` CLI to log it.

## When to Log Work

Log work when you complete:

- **Feature implementations**: New functionality added to the system
- **Bug fixes**: Issues resolved, defects corrected
- **Refactoring**: Significant code restructuring or improvements
- **Architectural decisions**: Design changes, technology choices
- **Performance optimizations**: Measurable improvements to speed or efficiency
- **Configuration updates**: Build, deployment, or infrastructure changes
- **Documentation**: Meaningful additions beyond trivial updates

## What NOT to Log

Do not log:

- Reading files or exploring the codebase
- Planning activities or research
- Failed attempts or incomplete work
- Trivial changes (typos, formatting, single-line fixes)
- File operations without meaningful outcomes
- Starting work (only log completions)

## Usage

```bash
aw task "description of what was completed" --category <category>
```

**IMPORTANT**: Always include the `--category` flag to categorize your work.

## Categories

Choose the most appropriate category:

- **feature** - New functionality or capabilities
- **bugfix** - Fixed defects or issues
- **refactor** - Code restructuring without behavior change
- **docs** - Documentation updates
- **config** - Build, deployment, or infrastructure setup
- **test** - Test additions or improvements
- **perf** - Performance optimizations
- **infra** - Infrastructure or tooling changes
- **security** - Security improvements or fixes

## Description Guidelines

1. **Always specify category**: Every task must have a category
2. **Be specific**: State what was done and what it affects
3. **Use active voice**: "Implemented X", "Fixed Y", "Refactored Z"
4. **Include key details**: Technology, component, or feature name
5. **Keep it concise**: 5-15 words is ideal
6. **Focus on outcome**: What changed, not how you did it

## Examples

### Good Examples

```bash
aw task "Implemented JWT authentication with refresh token support" --category feature
aw task "Fixed race condition in database connection pooling" --category bugfix
aw task "Refactored API routes to use middleware pattern" --category refactor
aw task "Added comprehensive TypeScript types to user module" --category feature
aw task "Optimized image processing pipeline reducing memory by 40%" --category perf
aw task "Updated API documentation with authentication examples" --category docs
aw task "Added unit tests for payment processing module" --category test
aw task "Configured PostgreSQL connection pooling in production" --category config
```

### Bad Examples

```bash
aw task "Made some changes"  # Too vague, no category
aw task "Starting authentication work"  # Not a completion
aw task "Fixed typo"  # Too trivial
aw task "Read the code"  # Not meaningful work
aw task "Edited files and stuff" --category feature  # Unclear outcome
```

## Integration Notes

- The `aw` command is globally available after installation
- Logs are stored in `~/.aw/worklog.db` (SQLite database)
- Timestamps are added automatically in ISO 8601 format
- Each entry is indexed for efficient querying
- The database persists across projects and sessions

## Automatic Metadata Collection

The following information is collected automatically with each entry:

- **session_id**: From `CLAUDE_SESSION_ID` environment variable (if set)
- **project_name**: Auto-detected from git repository name or directory name
- **git_branch**: Current git branch (if in a git repository)
- **working_directory**: Directory where the command was executed
- **timestamp**: ISO 8601 format timestamp
- **created_at**: Unix timestamp for database operations

This metadata enables filtering and analysis of work across projects, sessions, and branches.

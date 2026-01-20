import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const SKILL_CONTENT = `# Agent Work Log

Log completed work activities to a centralized database for tracking and analysis.

## When to Use

Use the \`aw task\` command to log work when you complete:

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

\`\`\`bash
aw task "description of completed work" --category <category>
\`\`\`

**Session Tracking**: Set \`CLAUDE_SESSION_ID\` environment variable at the start of your session to correlate all work from that session.

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

\`\`\`bash
aw task "Implemented JWT authentication with refresh tokens" --category feature
aw task "Fixed memory leak in WebSocket connection handler" --category bugfix
aw task "Refactored database layer to use connection pooling" --category refactor
aw task "Added comprehensive error handling to API endpoints" --category feature
aw task "Optimized search query performance by 10x with indexing" --category perf
aw task "Updated API documentation with new endpoints" --category docs
aw task "Added unit tests for authentication module" --category test
aw task "Configured CI/CD pipeline for automated deployments" --category config
\`\`\`

### Bad Examples

\`\`\`bash
# Too vague
aw task "Made some changes"

# Not a completion
aw task "Started working on authentication"

# Too trivial
aw task "Fixed typo in variable name"

# Just exploration
aw task "Read the authentication code"
\`\`\`

## Best Practices

1. **Always specify category**: Use \`--category\` to categorize the work
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

This skill automatically invokes the \`aw\` CLI tool, which:

- Stores entries in \`~/.aw/worklog.db\` (SQLite database)
- Adds timestamps automatically (ISO 8601 format)
- Works from any directory (global installation)
- Provides instant feedback on successful logging

## Technical Details

- **Command**: \`aw task "<description>" --category <category>\`
- **Database**: \`~/.aw/worklog.db\`
- **Schema**: \`work_entries\` table with:
  - \`id\` - Auto-incrementing primary key
  - \`timestamp\` - ISO 8601 timestamp
  - \`task_description\` - Description of the work
  - \`session_id\` - From \`CLAUDE_SESSION_ID\` env var (nullable)
  - \`category\` - Work category (nullable)
  - \`project_name\` - Auto-detected from git repo or directory
  - \`git_branch\` - Auto-detected current branch (nullable)
  - \`working_directory\` - Directory where command was run
  - \`created_at\` - Unix timestamp of database insertion
- **Output**: \`✓ Logged: <description> [category]\` on success
- **Auto-detection**: Project name, git branch, and working directory are collected automatically
`;

const CLAUDE_MD_SECTION = `
# Agent Work Log

This project uses the Agent Work Log system to track completed work. Use the \`aw task\` command to log meaningful accomplishments.

**Rule of thumb: Every commit should have a corresponding \`aw task\` entry.**

## When to Log Work

Log work when you complete or accomplish:

- **Feature implementations**: New functionality added to the system
- **Bug fixes**: Issues resolved, defects corrected
- **Debugging work**: Investigated and fixed issues (e.g., "Debugged and fixed API routing issue")
- **Refactoring**: Significant code restructuring or improvements
- **Architectural decisions**: Design changes, technology choices
- **Performance optimizations**: Measurable improvements to speed or efficiency
- **Configuration updates**: Build, deployment, or infrastructure changes
- **Documentation**: Meaningful additions beyond trivial updates
- **Research tasks**: Completed investigations, explorations, or analysis that provides value
- **Interesting explorations**: Even if incomplete, log work that explores a direction with meaningful findings or learnings

## Triggers - When to Log

Log your work immediately after:

- **Pushing a commit** - Log what you accomplished in that commit
- **Completing a task** - Before moving to the next task, log the completed one
- **Fixing a bug** - Even if it took significant debugging to find
- **Making a decision** - Architectural choices, technology selections
- **Finishing research** - Document what you learned or discovered

## What NOT to Log

Do not log:

- Simple file reading without analysis
- Trivial changes (typos, formatting, single-line fixes)
- Starting work (only log completions or meaningful progress)
- Pure planning without execution

## Usage

\`\`\`bash
aw task "description of what was completed" --category <category>
\`\`\`

**IMPORTANT**: Always include the \`--category\` flag to categorize your work.

## Categories

Choose the most appropriate category. Common categories include:

- **feature** - New functionality or capabilities
- **bugfix** - Fixed defects or issues
- **refactor** - Code restructuring without behavior change
- **docs** - Documentation updates
- **config** - Build, deployment, or infrastructure setup
- **test** - Test additions or improvements
- **perf** - Performance optimizations
- **infra** - Infrastructure or tooling changes
- **security** - Security improvements or fixes
- **research** - Investigation, exploration, or analysis tasks

**If none of these categories fit your work, create a descriptive category name that best represents what you accomplished.** Keep it concise (one word when possible) and use lowercase.

## Description Guidelines

1. **Always specify category**: Every task must have a category
2. **Be specific**: State what was done and what it affects
3. **Use active voice**: "Implemented X", "Fixed Y", "Refactored Z"
4. **Include key details**: Technology, component, or feature name
5. **Keep it concise**: 5-15 words is ideal
6. **Focus on outcome**: What changed, not how you did it

## Examples

### Good Examples

\`\`\`bash
aw task "Implemented JWT authentication with refresh token support" --category feature
aw task "Fixed race condition in database connection pooling" --category bugfix
aw task "Refactored API routes to use middleware pattern" --category refactor
aw task "Added comprehensive TypeScript types to user module" --category feature
aw task "Optimized image processing pipeline reducing memory by 40%" --category perf
aw task "Updated API documentation with authentication examples" --category docs
aw task "Added unit tests for payment processing module" --category test
aw task "Configured PostgreSQL connection pooling in production" --category config
aw task "Researched authentication patterns and compared OAuth vs JWT" --category research
aw task "Investigated performance bottleneck in data processing pipeline" --category research
aw task "Explored WebSocket implementation approaches for real-time features" --category exploration
\`\`\`

### Bad Examples

\`\`\`bash
aw task "Made some changes"  # Too vague, no category
aw task "Starting authentication work"  # Not a completion
aw task "Fixed typo"  # Too trivial
aw task "Read the code"  # Not meaningful work
aw task "Edited files and stuff" --category feature  # Unclear outcome
\`\`\`

## Integration Notes

- The \`aw\` command is globally available after installation
- Logs are stored in \`~/.aw/worklog.db\` (SQLite database)
- Timestamps are added automatically in ISO 8601 format
- Each entry is indexed for efficient querying
- The database persists across projects and sessions

## Automatic Metadata Collection

The following information is collected automatically with each entry:

- **session_id**: From \`CLAUDE_SESSION_ID\` environment variable (if set)
- **project_name**: Auto-detected from git repository name or directory name
- **git_branch**: Current git branch (if in a git repository)
- **working_directory**: Directory where the command was executed
- **timestamp**: ISO 8601 format timestamp
- **created_at**: Unix timestamp for database operations

This metadata enables filtering and analysis of work across projects, sessions, and branches.

---

**Remember: Log your work with \`aw task\` after completing tasks. If you pushed a commit, log it!**

<!-- End Agent Work Log -->
`;

function getClaudeDir(global: boolean): string {
	if (global) {
		return join(homedir(), '.claude');
	}
	return resolve(process.cwd(), '.claude');
}

function ensureDirectoryExists(dir: string): void {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

function installSkill(claudeDir: string): void {
	const skillsDir = join(claudeDir, 'skills');
	const worklogSkillDir = join(skillsDir, 'worklog');

	ensureDirectoryExists(worklogSkillDir);

	const skillPath = join(worklogSkillDir, 'SKILL.md');
	writeFileSync(skillPath, SKILL_CONTENT, 'utf8');

	console.log(`✓ Installed skill to ${skillPath}`);
}

function updateSettings(claudeDir: string): void {
	const settingsPath = join(claudeDir, 'settings.json');

	let settings: any = {};

	if (existsSync(settingsPath)) {
		const content = readFileSync(settingsPath, 'utf8');
		settings = JSON.parse(content);
	}

	// Ensure permissions structure exists
	if (!settings.permissions) {
		settings.permissions = {};
	}
	if (!settings.permissions.allow) {
		settings.permissions.allow = [];
	}

	// Add aw command permission if not already present
	const awPermission = 'Bash(aw:*)';
	if (!settings.permissions.allow.includes(awPermission)) {
		settings.permissions.allow.push(awPermission);
		writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
		console.log(`✓ Added aw command permission to ${settingsPath}`);
	} else {
		console.log(`✓ aw command permission already exists in ${settingsPath}`);
	}
}

function updateClaudeMd(claudeDir: string): void {
	const claudeMdPath = join(claudeDir, 'CLAUDE.md');

	let content = '';
	let exists = false;

	if (existsSync(claudeMdPath)) {
		content = readFileSync(claudeMdPath, 'utf8');
		exists = true;

		// Check if worklog section exists with boundary markers
		const startMarker = '# Agent Work Log';
		const endMarker = '<!-- End Agent Work Log -->';

		if (content.includes(startMarker) && content.includes(endMarker)) {
			// Replace existing section between markers
			const startIndex = content.indexOf(startMarker);
			const endIndex = content.indexOf(endMarker) + endMarker.length;

			const before = content.substring(0, startIndex);
			const after = content.substring(endIndex);

			const updatedContent = `${before}${CLAUDE_MD_SECTION.trim()}${after}`;
			writeFileSync(claudeMdPath, updatedContent, 'utf8');
			console.log(`✓ Updated Agent Work Log section in ${claudeMdPath}`);
			return;
		} else if (content.includes(startMarker)) {
			// Old format without end marker - warn user
			console.log(`⚠ CLAUDE.md contains Agent Work Log section without end marker at ${claudeMdPath}`);
			console.log('  Skipping update to avoid duplicates. Please add <!-- End Agent Work Log --> marker.');
			return;
		}
	}

	// Append the section (or create new file)
	const updatedContent = content
		? `${content.trimEnd()}\n\n${CLAUDE_MD_SECTION.trim()}\n`
		: `${CLAUDE_MD_SECTION.trim()}\n`;

	writeFileSync(claudeMdPath, updatedContent, 'utf8');

	if (exists) {
		console.log(`✓ Updated ${claudeMdPath}`);
	} else {
		console.log(`✓ Created ${claudeMdPath}`);
	}
}

export function install(global: boolean): void {
	try {
		const claudeDir = getClaudeDir(global);
		const scope = global ? 'globally' : 'locally';

		console.log(`Installing Agent Work Log ${scope}...`);
		console.log(`Target directory: ${claudeDir}\n`);

		ensureDirectoryExists(claudeDir);
		installSkill(claudeDir);
		updateSettings(claudeDir);
		updateClaudeMd(claudeDir);

		console.log(`\n✓ Successfully installed Agent Work Log ${scope}`);

		if (global) {
			console.log(
				'\nThe worklog skill is now available in all Claude Code sessions.'
			);
		} else {
			console.log(
				'\nThe worklog skill is now available for this project in Claude Code.'
			);
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to install: ${error.message}`);
		}
		throw error;
	}
}

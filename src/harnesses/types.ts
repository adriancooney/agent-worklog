export interface InstallResult {
  success: boolean;
  message: string;
}

export interface Harness {
  name: string;
  displayName: string;

  supportsHooks: boolean;
  supportsSkills: boolean;
  supportsGlobal: boolean;

  detect(): Promise<boolean>;
  getConfigDir(global: boolean): string;
  install(global: boolean): Promise<InstallResult[]>;
  uninstall(global: boolean): Promise<InstallResult[]>;
  getSessionEnvVar(): string | null;
}

export const WORKLOG_START_MARKER = '# Agent Work Log';
export const WORKLOG_END_MARKER = '<!-- End Agent Work Log -->';

export const WORKLOG_INSTRUCTIONS = `# Agent Work Log

Log completed work with \`aw task "description" --category <category>\`

## What to Log

Log meaningful completions: features, bug fixes, refactors, config changes, tests, docs, research findings.

**Don't log**: file reading, trivial edits, planning, incomplete work.

## Categories

feature | bugfix | refactor | docs | config | test | perf | infra | security | research

## Examples

\`\`\`bash
aw task "Implemented JWT authentication with refresh tokens" --category feature
aw task "Fixed race condition in database connection pooling" --category bugfix
aw task "Refactored API routes to use middleware pattern" --category refactor
\`\`\`

<!-- End Agent Work Log -->`;

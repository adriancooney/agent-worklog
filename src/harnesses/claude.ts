import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type { Harness, InstallResult } from './types.js';
import { WORKLOG_START_MARKER, WORKLOG_END_MARKER, WORKLOG_INSTRUCTIONS } from './types.js';

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
- **Research findings**: Conclusions from investigating code, APIs, or technical approaches

## When NOT to Log

Do not log:

- Reading files or exploring code without conclusions
- Failed attempts or incomplete work
- Trivial changes (typos, formatting, single-line edits)
- Preliminary planning without actionable outcomes
- Tool invocations without meaningful outcomes

## Usage

\`\`\`bash
aw task "description of completed work" --category <category>
\`\`\`

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
- **research** - Investigation findings, technical analysis, or exploration conclusions

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
aw task "Investigated WebSocket reconnection patterns for real-time sync" --category research
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

function installSkill(claudeDir: string): InstallResult {
  const skillsDir = join(claudeDir, 'skills');
  const worklogSkillDir = join(skillsDir, 'worklog');

  ensureDirectoryExists(worklogSkillDir);

  const skillPath = join(worklogSkillDir, 'SKILL.md');
  writeFileSync(skillPath, SKILL_CONTENT, 'utf8');

  return { success: true, message: `Installed skill to ${skillPath}` };
}

function updateSettings(claudeDir: string): InstallResult[] {
  const results: InstallResult[] = [];
  const settingsPath = join(claudeDir, 'settings.json');

  let settings: any = {};

  if (existsSync(settingsPath)) {
    const content = readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(content);
  }

  let modified = false;

  if (!settings.permissions) {
    settings.permissions = {};
  }
  if (!settings.permissions.allow) {
    settings.permissions.allow = [];
  }

  const awPermission = 'Bash(aw:*)';
  if (!settings.permissions.allow.includes(awPermission)) {
    settings.permissions.allow.push(awPermission);
    modified = true;
    results.push({ success: true, message: 'Added aw command permission' });
  } else {
    results.push({ success: true, message: 'aw command permission already exists' });
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }
  if (!settings.hooks.UserPromptSubmit) {
    settings.hooks.UserPromptSubmit = [];
  }

  const hookExists = settings.hooks.UserPromptSubmit.some((entry: any) =>
    entry.hooks?.some((h: any) => h.command?.includes('aw hooks remind'))
  );

  if (!hookExists) {
    settings.hooks.UserPromptSubmit.push({
      hooks: [
        {
          type: 'command',
          command: 'aw hooks remind',
        },
      ],
    });
    modified = true;
    results.push({ success: true, message: 'Added UserPromptSubmit hook' });
  } else {
    results.push({ success: true, message: 'UserPromptSubmit hook already exists' });
  }

  if (modified) {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    results.push({ success: true, message: `Updated ${settingsPath}` });
  }

  return results;
}

function updateClaudeMd(claudeDir: string): InstallResult {
  const claudeMdPath = join(claudeDir, 'CLAUDE.md');

  let content = '';
  let exists = false;

  if (existsSync(claudeMdPath)) {
    content = readFileSync(claudeMdPath, 'utf8');
    exists = true;

    if (content.includes(WORKLOG_START_MARKER) && content.includes(WORKLOG_END_MARKER)) {
      const startIndex = content.indexOf(WORKLOG_START_MARKER);
      const endIndex = content.indexOf(WORKLOG_END_MARKER) + WORKLOG_END_MARKER.length;

      const before = content.substring(0, startIndex);
      const after = content.substring(endIndex);

      const updatedContent = `${before}${WORKLOG_INSTRUCTIONS.trim()}${after}`;
      writeFileSync(claudeMdPath, updatedContent, 'utf8');
      return { success: true, message: `Updated Agent Work Log section in ${claudeMdPath}` };
    } else if (content.includes(WORKLOG_START_MARKER)) {
      return {
        success: false,
        message: `CLAUDE.md contains Agent Work Log section without end marker. Please add ${WORKLOG_END_MARKER} marker.`,
      };
    }
  }

  const updatedContent = content
    ? `${content.trimEnd()}\n\n${WORKLOG_INSTRUCTIONS.trim()}\n`
    : `${WORKLOG_INSTRUCTIONS.trim()}\n`;

  writeFileSync(claudeMdPath, updatedContent, 'utf8');

  return {
    success: true,
    message: exists ? `Updated ${claudeMdPath}` : `Created ${claudeMdPath}`,
  };
}

function removeSkill(claudeDir: string): InstallResult[] {
  const results: InstallResult[] = [];
  const skillsDir = join(claudeDir, 'skills');
  const worklogSkillDir = join(skillsDir, 'worklog');
  const skillPath = join(worklogSkillDir, 'SKILL.md');

  if (existsSync(skillPath)) {
    rmSync(skillPath);
    results.push({ success: true, message: `Removed skill file ${skillPath}` });

    if (existsSync(worklogSkillDir) && readdirSync(worklogSkillDir).length === 0) {
      rmSync(worklogSkillDir, { recursive: true });
      results.push({ success: true, message: `Removed empty directory ${worklogSkillDir}` });
    }

    if (existsSync(skillsDir) && readdirSync(skillsDir).length === 0) {
      rmSync(skillsDir, { recursive: true });
      results.push({ success: true, message: `Removed empty directory ${skillsDir}` });
    }
  } else {
    results.push({ success: true, message: 'Skill file not found (already removed)' });
  }

  return results;
}

function removeFromSettings(claudeDir: string): InstallResult[] {
  const results: InstallResult[] = [];
  const settingsPath = join(claudeDir, 'settings.json');

  if (!existsSync(settingsPath)) {
    results.push({ success: true, message: 'Settings file not found (nothing to remove)' });
    return results;
  }

  const content = readFileSync(settingsPath, 'utf8');
  const settings = JSON.parse(content);
  let modified = false;

  const awPermission = 'Bash(aw:*)';
  if (settings.permissions?.allow?.includes(awPermission)) {
    settings.permissions.allow = settings.permissions.allow.filter((p: string) => p !== awPermission);
    modified = true;
    results.push({ success: true, message: 'Removed aw command permission' });
  } else {
    results.push({ success: true, message: 'aw command permission not found (already removed)' });
  }

  if (settings.hooks?.UserPromptSubmit) {
    const originalLength = settings.hooks.UserPromptSubmit.length;
    settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
      (entry: any) => !entry.hooks?.some((h: any) => h.command?.includes('aw hooks remind'))
    );

    if (settings.hooks.UserPromptSubmit.length < originalLength) {
      modified = true;
      results.push({ success: true, message: 'Removed UserPromptSubmit hook' });
    } else {
      results.push({ success: true, message: 'UserPromptSubmit hook not found (already removed)' });
    }

    if (settings.hooks.UserPromptSubmit.length === 0) {
      delete settings.hooks.UserPromptSubmit;
    }

    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }
  }

  if (settings.permissions?.allow?.length === 0) {
    delete settings.permissions.allow;
  }

  if (settings.permissions && Object.keys(settings.permissions).length === 0) {
    delete settings.permissions;
  }

  if (modified) {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    results.push({ success: true, message: `Updated ${settingsPath}` });
  }

  return results;
}

function removeFromClaudeMd(claudeDir: string): InstallResult {
  const claudeMdPath = join(claudeDir, 'CLAUDE.md');

  if (!existsSync(claudeMdPath)) {
    return { success: true, message: 'CLAUDE.md not found (nothing to remove)' };
  }

  let content = readFileSync(claudeMdPath, 'utf8');

  if (content.includes(WORKLOG_START_MARKER) && content.includes(WORKLOG_END_MARKER)) {
    const startIndex = content.indexOf(WORKLOG_START_MARKER);
    const endIndex = content.indexOf(WORKLOG_END_MARKER) + WORKLOG_END_MARKER.length;

    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);

    const updatedContent = (before.trimEnd() + '\n' + after.trimStart()).trim();

    if (updatedContent.length === 0) {
      rmSync(claudeMdPath);
      return { success: true, message: `Removed empty ${claudeMdPath}` };
    } else {
      writeFileSync(claudeMdPath, updatedContent + '\n', 'utf8');
      return { success: true, message: `Removed Agent Work Log section from ${claudeMdPath}` };
    }
  } else if (content.includes(WORKLOG_START_MARKER)) {
    return {
      success: false,
      message: 'CLAUDE.md contains Agent Work Log section without end marker. Cannot safely remove.',
    };
  }

  return { success: true, message: 'Agent Work Log section not found in CLAUDE.md (already removed)' };
}

export const claudeHarness: Harness = {
  name: 'claude',
  displayName: 'Claude Code',
  supportsHooks: true,
  supportsSkills: true,
  supportsGlobal: true,

  async detect(): Promise<boolean> {
    const globalDir = join(homedir(), '.claude');
    if (existsSync(globalDir)) {
      return true;
    }

    try {
      execSync('which claude', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },

  getConfigDir(global: boolean): string {
    return getClaudeDir(global);
  },

  async install(global: boolean): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    const claudeDir = getClaudeDir(global);

    ensureDirectoryExists(claudeDir);

    results.push(installSkill(claudeDir));
    results.push(...updateSettings(claudeDir));
    results.push(updateClaudeMd(claudeDir));

    return results;
  },

  async uninstall(global: boolean): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    const claudeDir = getClaudeDir(global);

    if (!existsSync(claudeDir)) {
      results.push({ success: true, message: `Claude directory not found at ${claudeDir}. Nothing to uninstall.` });
      return results;
    }

    results.push(...removeSkill(claudeDir));
    results.push(...removeFromSettings(claudeDir));
    results.push(removeFromClaudeMd(claudeDir));

    return results;
  },

  getSessionEnvVar(): string | null {
    return 'CLAUDE_SESSION_ID';
  },
};

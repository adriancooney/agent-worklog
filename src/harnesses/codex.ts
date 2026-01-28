import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type { Harness, InstallResult } from './types.js';
import { WORKLOG_START_MARKER, WORKLOG_END_MARKER, WORKLOG_INSTRUCTIONS } from './types.js';

function getCodexDir(global: boolean): string {
  if (global) {
    return join(homedir(), '.codex');
  }
  return process.cwd();
}

function getAgentsMdPath(global: boolean): string {
  return join(getCodexDir(global), 'AGENTS.md');
}

function ensureDirectoryExists(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function updateAgentsMd(filePath: string): InstallResult {
  let content = '';
  let exists = false;

  if (existsSync(filePath)) {
    content = readFileSync(filePath, 'utf8');
    exists = true;

    if (content.includes(WORKLOG_START_MARKER) && content.includes(WORKLOG_END_MARKER)) {
      const startIndex = content.indexOf(WORKLOG_START_MARKER);
      const endIndex = content.indexOf(WORKLOG_END_MARKER) + WORKLOG_END_MARKER.length;

      const before = content.substring(0, startIndex);
      const after = content.substring(endIndex);

      const updatedContent = `${before}${WORKLOG_INSTRUCTIONS.trim()}${after}`;
      writeFileSync(filePath, updatedContent, 'utf8');
      return { success: true, message: `Updated Agent Work Log section in ${filePath}` };
    } else if (content.includes(WORKLOG_START_MARKER)) {
      return {
        success: false,
        message: `AGENTS.md contains Agent Work Log section without end marker. Please add ${WORKLOG_END_MARKER} marker.`,
      };
    }
  }

  const updatedContent = content
    ? `${content.trimEnd()}\n\n${WORKLOG_INSTRUCTIONS.trim()}\n`
    : `${WORKLOG_INSTRUCTIONS.trim()}\n`;

  writeFileSync(filePath, updatedContent, 'utf8');

  return {
    success: true,
    message: exists ? `Updated ${filePath}` : `Created ${filePath}`,
  };
}

function removeFromAgentsMd(filePath: string): InstallResult {
  if (!existsSync(filePath)) {
    return { success: true, message: 'AGENTS.md not found (nothing to remove)' };
  }

  let content = readFileSync(filePath, 'utf8');

  if (content.includes(WORKLOG_START_MARKER) && content.includes(WORKLOG_END_MARKER)) {
    const startIndex = content.indexOf(WORKLOG_START_MARKER);
    const endIndex = content.indexOf(WORKLOG_END_MARKER) + WORKLOG_END_MARKER.length;

    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);

    const updatedContent = (before.trimEnd() + '\n' + after.trimStart()).trim();

    if (updatedContent.length === 0) {
      rmSync(filePath);
      return { success: true, message: `Removed empty ${filePath}` };
    } else {
      writeFileSync(filePath, updatedContent + '\n', 'utf8');
      return { success: true, message: `Removed Agent Work Log section from ${filePath}` };
    }
  } else if (content.includes(WORKLOG_START_MARKER)) {
    return {
      success: false,
      message: 'AGENTS.md contains Agent Work Log section without end marker. Cannot safely remove.',
    };
  }

  return { success: true, message: 'Agent Work Log section not found in AGENTS.md (already removed)' };
}

export const codexHarness: Harness = {
  name: 'codex',
  displayName: 'OpenAI Codex',
  supportsHooks: false,
  supportsSkills: false,
  supportsGlobal: true,

  async detect(): Promise<boolean> {
    const globalDir = join(homedir(), '.codex');
    if (existsSync(globalDir)) {
      return true;
    }

    try {
      execSync('which codex', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },

  getConfigDir(global: boolean): string {
    return getCodexDir(global);
  },

  async install(global: boolean): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    const configDir = getCodexDir(global);
    const agentsMdPath = getAgentsMdPath(global);

    if (global) {
      ensureDirectoryExists(configDir);
    }

    results.push(updateAgentsMd(agentsMdPath));

    return results;
  },

  async uninstall(global: boolean): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    const agentsMdPath = getAgentsMdPath(global);

    results.push(removeFromAgentsMd(agentsMdPath));

    return results;
  },

  getSessionEnvVar(): string | null {
    return null;
  },
};

import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import type { Harness, InstallResult } from './types.js';
import { WORKLOG_START_MARKER, WORKLOG_END_MARKER, WORKLOG_INSTRUCTIONS } from './types.js';

function getAgentsMdPath(): string {
  return resolve(process.cwd(), 'AGENTS.md');
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

export const agentsMdHarness: Harness = {
  name: 'agents-md',
  displayName: 'AGENTS.md (Universal)',
  supportsHooks: false,
  supportsSkills: false,
  supportsGlobal: false,

  async detect(): Promise<boolean> {
    // Always available as fallback
    return true;
  },

  getConfigDir(_global: boolean): string {
    return process.cwd();
  },

  async install(_global: boolean): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    const agentsMdPath = getAgentsMdPath();

    results.push(updateAgentsMd(agentsMdPath));

    return results;
  },

  async uninstall(_global: boolean): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    const agentsMdPath = getAgentsMdPath();

    results.push(removeFromAgentsMd(agentsMdPath));

    return results;
  },

  getSessionEnvVar(): string | null {
    return null;
  },
};

import { resolve } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import type { Harness, InstallResult } from './types.js';
import { WORKLOG_START_MARKER, WORKLOG_END_MARKER, WORKLOG_INSTRUCTIONS } from './types.js';

function getCursorDir(): string {
  return resolve(process.cwd(), '.cursor', 'rules');
}

function ensureDirectoryExists(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

const CURSOR_RULE_CONTENT = `---
description: "Log completed work to agent-worklog database"
alwaysApply: true
---

${WORKLOG_INSTRUCTIONS}`;

export const cursorHarness: Harness = {
  name: 'cursor',
  displayName: 'Cursor',
  supportsHooks: false,
  supportsSkills: false,
  supportsGlobal: false,

  async detect(): Promise<boolean> {
    const cursorDir = resolve(process.cwd(), '.cursor');
    return existsSync(cursorDir);
  },

  getConfigDir(_global: boolean): string {
    return getCursorDir();
  },

  async install(_global: boolean): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    const rulesDir = getCursorDir();
    const rulePath = resolve(rulesDir, 'worklog.mdc');

    ensureDirectoryExists(rulesDir);
    writeFileSync(rulePath, CURSOR_RULE_CONTENT, 'utf8');
    results.push({ success: true, message: `Created ${rulePath}` });

    return results;
  },

  async uninstall(_global: boolean): Promise<InstallResult[]> {
    const results: InstallResult[] = [];
    const rulePath = resolve(getCursorDir(), 'worklog.mdc');

    if (existsSync(rulePath)) {
      rmSync(rulePath);
      results.push({ success: true, message: `Removed ${rulePath}` });
    } else {
      results.push({ success: true, message: 'Cursor rule not found (already removed)' });
    }

    return results;
  },

  getSessionEnvVar(): string | null {
    return null;
  },
};

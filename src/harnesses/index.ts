import type { Harness, InstallResult } from './types.js';
import { claudeHarness } from './claude.js';
import { cursorHarness } from './cursor.js';
import { codexHarness } from './codex.js';
import { opencodeHarness } from './opencode.js';
import { agentsMdHarness } from './agents-md.js';

export type { Harness, InstallResult } from './types.js';
export { WORKLOG_START_MARKER, WORKLOG_END_MARKER, WORKLOG_INSTRUCTIONS } from './types.js';

const harnesses: Harness[] = [
  claudeHarness,
  cursorHarness,
  codexHarness,
  opencodeHarness,
  agentsMdHarness,
];

export function getHarness(name: string): Harness | undefined {
  return harnesses.find((h) => h.name === name);
}

export function getAllHarnesses(): Harness[] {
  return harnesses;
}

export function getHarnessNames(): string[] {
  return harnesses.map((h) => h.name);
}

export async function detectHarnesses(): Promise<Harness[]> {
  const detected: Harness[] = [];

  for (const harness of harnesses) {
    // Skip agents-md in detection - it's always available as fallback
    if (harness.name === 'agents-md') continue;

    if (await harness.detect()) {
      detected.push(harness);
    }
  }

  return detected;
}

export async function detectAndInstall(
  global: boolean,
  specificHarness?: string
): Promise<Map<string, InstallResult[]>> {
  const results = new Map<string, InstallResult[]>();

  if (specificHarness) {
    const harness = getHarness(specificHarness);
    if (!harness) {
      results.set(specificHarness, [
        { success: false, message: `Unknown harness: ${specificHarness}` },
      ]);
      return results;
    }

    if (global && !harness.supportsGlobal) {
      results.set(harness.name, [
        { success: false, message: `${harness.displayName} does not support global installation` },
      ]);
      return results;
    }

    results.set(harness.name, await harness.install(global));
    return results;
  }

  // Auto-detect and install to all detected harnesses
  const detected = await detectHarnesses();

  if (detected.length === 0) {
    // Fall back to AGENTS.md
    results.set(agentsMdHarness.name, await agentsMdHarness.install(global));
    return results;
  }

  for (const harness of detected) {
    if (global && !harness.supportsGlobal) {
      results.set(harness.name, [
        { success: true, message: `Skipped ${harness.displayName} (does not support global installation)` },
      ]);
      continue;
    }

    results.set(harness.name, await harness.install(global));
  }

  return results;
}

export async function detectAndUninstall(
  global: boolean,
  specificHarness?: string
): Promise<Map<string, InstallResult[]>> {
  const results = new Map<string, InstallResult[]>();

  if (specificHarness) {
    const harness = getHarness(specificHarness);
    if (!harness) {
      results.set(specificHarness, [
        { success: false, message: `Unknown harness: ${specificHarness}` },
      ]);
      return results;
    }

    if (global && !harness.supportsGlobal) {
      results.set(harness.name, [
        { success: false, message: `${harness.displayName} does not support global installation` },
      ]);
      return results;
    }

    results.set(harness.name, await harness.uninstall(global));
    return results;
  }

  // Auto-detect and uninstall from all detected harnesses
  const detected = await detectHarnesses();

  if (detected.length === 0) {
    // Try to uninstall from AGENTS.md
    results.set(agentsMdHarness.name, await agentsMdHarness.uninstall(global));
    return results;
  }

  for (const harness of detected) {
    if (global && !harness.supportsGlobal) {
      continue;
    }

    results.set(harness.name, await harness.uninstall(global));
  }

  return results;
}

export function getSessionId(): string | null {
  // Check tool-specific env vars in order of preference
  const envVars = [
    'CLAUDE_SESSION_ID',
    'AW_SESSION_ID', // User-provided fallback
  ];

  for (const envVar of envVars) {
    const value = process.env[envVar];
    if (value) {
      return value;
    }
  }

  return null;
}

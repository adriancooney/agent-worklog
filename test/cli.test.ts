import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { $ } from 'zx';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

$.verbose = false;

interface WorkEntryRow {
  id: number;
  timestamp: string;
  task_description: string;
  session_id: string | null;
  category: string | null;
  project_name: string | null;
  git_branch: string | null;
  working_directory: string | null;
  created_at: number;
}

interface IndexRow {
  name: string;
}

interface ColumnRow {
  name: string;
}

interface CategoryCountRow {
  category: string;
  count: number;
}

describe('CLI Integration Tests', () => {
  let testConfigDir: string;

  beforeEach(() => {
    testConfigDir = mkdtempSync(join(tmpdir(), 'aw-test-'));
    process.env.AW_CONFIG_DIR = testConfigDir;
  });

  afterEach(() => {
    delete process.env.AW_CONFIG_DIR;
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  const getDb = () => {
    const dbPath = join(testConfigDir, 'worklog.db');
    return new Database(dbPath);
  };

  const runCli = async (args: string, extraEnv: Record<string, string> = {}) => {
    const env = {
      ...process.env,
      AW_CONFIG_DIR: testConfigDir,
      ...extraEnv,
    };

    $.env = env;
    const result = await $`sh -c ${'tsx bin/aw.ts ' + args}`;
    return result;
  };

  describe('Basic Functionality', () => {
    it('should create database on first run', async () => {
      await runCli('task "First entry" -c test');

      const dbPath = join(testConfigDir, 'worklog.db');
      expect(existsSync(dbPath)).toBe(true);
    });

    it('should log a task with description', async () => {
      const result = await runCli('task "Test task description" -c feature');

      expect(result.stdout).toContain('✓ Logged: Test task description [feature]');

      const db = getDb();
      const entries = db.prepare('SELECT * FROM work_entries').all() as WorkEntryRow[];
      expect(entries).toHaveLength(1);
      expect(entries[0].task_description).toBe('Test task description');
      db.close();
    });

    it('should handle special characters in description', async () => {
      await runCli('task "Special chars: !@#$%^&*()" -c test');

      const db = getDb();
      const entry = db.prepare('SELECT task_description FROM work_entries').get() as WorkEntryRow;
      expect(entry.task_description).toBe('Special chars: !@#$%^&*()');
      db.close();
    });
  });

  describe('Category Support', () => {
    it('should log task with --category flag', async () => {
      await runCli('task "Feature implementation" --category feature');

      const db = getDb();
      const entry = db.prepare('SELECT category FROM work_entries').get() as WorkEntryRow;
      expect(entry.category).toBe('feature');
      db.close();
    });

    it('should log task with -c shorthand', async () => {
      await runCli('task "Bug fix" -c bugfix');

      const db = getDb();
      const entry = db.prepare('SELECT category FROM work_entries').get() as WorkEntryRow;
      expect(entry.category).toBe('bugfix');
      db.close();
    });

    it('should support all category types', async () => {
      const categories = [
        'feature',
        'bugfix',
        'refactor',
        'docs',
        'config',
        'test',
        'perf',
        'infra',
        'security',
      ];

      for (const category of categories) {
        await runCli(`task "Test ${category}" -c ${category}`);
      }

      const db = getDb();
      const entries = db.prepare('SELECT category FROM work_entries').all() as WorkEntryRow[];
      const storedCategories = entries.map((e) => e.category);

      for (const category of categories) {
        expect(storedCategories).toContain(category);
      }

      db.close();
    }, 15000);

    it('should work without category (nullable)', async () => {
      await runCli('task "Task without category"');

      const db = getDb();
      const entry = db.prepare('SELECT category FROM work_entries').get() as WorkEntryRow;
      expect(entry.category).toBeNull();
      db.close();
    });
  });

  describe('Session Tracking', () => {
    it('should capture CLAUDE_SESSION_ID from environment', async () => {
      const sessionId = 'test-session-123';

      await runCli('task "Session test" -c test', {
        CLAUDE_SESSION_ID: sessionId,
      });

      const db = getDb();
      const entry = db.prepare('SELECT session_id FROM work_entries').get() as WorkEntryRow;
      expect(entry.session_id).toBe(sessionId);
      db.close();
    });

    it('should work without session_id (nullable)', async () => {
      await runCli('task "No session" -c test');

      const db = getDb();
      const entry = db.prepare('SELECT session_id FROM work_entries').get() as WorkEntryRow;
      expect(entry.session_id).toBeNull();
      db.close();
    });

    it('should correlate multiple tasks with same session_id', async () => {
      const sessionId = 'shared-session-456';

      for (let i = 0; i < 3; i++) {
        await runCli(`task "Task ${i + 1}" -c test`, {
          CLAUDE_SESSION_ID: sessionId,
        });
      }

      const db = getDb();
      const entries = db
        .prepare('SELECT * FROM work_entries WHERE session_id = ?')
        .all(sessionId);
      expect(entries).toHaveLength(3);
      db.close();
    }, 10000);
  });

  describe('Metadata Collection', () => {
    it('should collect project name from git repo', async () => {
      await runCli('task "Git metadata test" -c test');

      const db = getDb();
      const entry = db.prepare('SELECT project_name FROM work_entries').get() as WorkEntryRow;
      expect(entry.project_name).toBe('agent-worklog');
      db.close();
    });

    it('should collect git branch', async () => {
      await runCli('task "Branch test" -c test');

      const db = getDb();
      const entry = db.prepare('SELECT git_branch FROM work_entries').get() as WorkEntryRow;
      expect(entry.git_branch).toBeTruthy();
      expect(typeof entry.git_branch).toBe('string');
      db.close();
    });

    it('should collect working directory', async () => {
      await runCli('task "Working dir test" -c test');

      const db = getDb();
      const entry = db.prepare('SELECT working_directory FROM work_entries').get() as WorkEntryRow;
      expect(entry.working_directory).toBeTruthy();
      expect(entry.working_directory).toContain('agent-worklog');
      db.close();
    });

    it('should store ISO 8601 timestamp', async () => {
      await runCli('task "Timestamp test" -c test');

      const db = getDb();
      const entry = db.prepare('SELECT timestamp FROM work_entries').get() as WorkEntryRow;
      expect(entry.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      db.close();
    });
  });

  describe('Database Schema', () => {
    it('should create all required indexes', async () => {
      await runCli('task "Index test" -c test');

      const db = getDb();
      const indexes = (db
        .prepare("SELECT name FROM sqlite_master WHERE type='index'")
        .all() as IndexRow[])
        .map((row) => row.name);

      expect(indexes).toContain('idx_timestamp');
      expect(indexes).toContain('idx_session_id');
      expect(indexes).toContain('idx_category');
      expect(indexes).toContain('idx_project_name');
      db.close();
    });

    it('should have correct schema structure', async () => {
      await runCli('task "Schema test" -c test');

      const db = getDb();
      const columns = db.prepare('PRAGMA table_info(work_entries)').all() as ColumnRow[];
      const columnNames = columns.map((col) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('timestamp');
      expect(columnNames).toContain('task_description');
      expect(columnNames).toContain('session_id');
      expect(columnNames).toContain('category');
      expect(columnNames).toContain('project_name');
      expect(columnNames).toContain('git_branch');
      expect(columnNames).toContain('working_directory');
      expect(columnNames).toContain('created_at');
      db.close();
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully without task description', async () => {
      try {
        await runCli('task');
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const e = error as { stderr?: string; stdout?: string };
        expect(e.stderr || e.stdout).toContain("missing required argument 'description'");
      }
    });
  });

  describe('Help and Version', () => {
    it('should display version', async () => {
      const result = await runCli('--version');
      expect(result.stdout.trim()).toBe('0.1.0');
    });

    it('should display help for main command', async () => {
      const result = await runCli('--help');
      expect(result.stdout).toContain('Agent Work Log');
      expect(result.stdout).toContain('task');
    });

    it('should display help for task command', async () => {
      const result = await runCli('task --help');
      expect(result.stdout).toContain('Log a completed task');
      expect(result.stdout).toContain('--category');
    });
  });

  describe('Multiple Entries', () => {
    it('should handle multiple task entries', async () => {
      const tasks = [
        { description: 'Task 1', category: 'feature' },
        { description: 'Task 2', category: 'bugfix' },
        { description: 'Task 3', category: 'test' },
      ];

      for (const task of tasks) {
        await runCli(`task "${task.description}" -c ${task.category}`);
      }

      const db = getDb();
      const entries = db.prepare('SELECT * FROM work_entries ORDER BY id').all() as WorkEntryRow[];
      expect(entries).toHaveLength(3);

      for (let i = 0; i < tasks.length; i++) {
        expect(entries[i].task_description).toBe(tasks[i].description);
        expect(entries[i].category).toBe(tasks[i].category);
      }

      db.close();
    }, 10000);
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await runCli('task "Feature A" -c feature');
      await runCli('task "Bug B" -c bugfix');
      await runCli('task "Feature C" -c feature');
    }, 10000);

    it('should filter by category', () => {
      const db = getDb();
      const features = db
        .prepare("SELECT * FROM work_entries WHERE category = 'feature'")
        .all();
      expect(features).toHaveLength(2);
      db.close();
    });

    it('should count by category', () => {
      const db = getDb();
      const counts = db
        .prepare('SELECT category, COUNT(*) as count FROM work_entries GROUP BY category')
        .all() as CategoryCountRow[];

      const featureCount = counts.find((c) => c.category === 'feature');
      const bugfixCount = counts.find((c) => c.category === 'bugfix');

      expect(featureCount?.count).toBe(2);
      expect(bugfixCount?.count).toBe(1);
      db.close();
    });
  });

  describe('Install Command', () => {
    let tempClaudeDir: string;

    beforeEach(() => {
      tempClaudeDir = mkdtempSync(join(tmpdir(), 'claude-test-'));
    });

    afterEach(() => {
      if (existsSync(tempClaudeDir)) {
        rmSync(tempClaudeDir, { recursive: true, force: true });
      }
    });

    const runInstallCli = async (args: string, cwd?: string) => {
      const projectRoot = process.cwd();
      const env = {
        ...process.env,
        HOME: tempClaudeDir,
      };

      $.env = env;

      if (cwd) {
        const result = await $`cd ${cwd} && tsx ${join(projectRoot, 'bin/aw.ts')} ${args.split(' ')}`;
        return result;
      }

      const result = await $`tsx ${join(projectRoot, 'bin/aw.ts')} ${args.split(' ')}`;
      return result;
    };

    it('should display help for install command', async () => {
      const result = await runInstallCli('install --help');
      expect(result.stdout).toContain('Install worklog instructions for AI coding tools');
      expect(result.stdout).toContain('--global');
      expect(result.stdout).toContain('--harness');
    });

    describe('Global Installation', () => {
      it('should create .claude directory in home', async () => {
        await runInstallCli('install --global');

        const claudeDir = join(tempClaudeDir, '.claude');
        expect(existsSync(claudeDir)).toBe(true);
      });

      it('should create skill file at correct path', async () => {
        await runInstallCli('install --global');

        const skillPath = join(tempClaudeDir, '.claude', 'skills', 'worklog', 'SKILL.md');
        expect(existsSync(skillPath)).toBe(true);

        const content = readFileSync(skillPath, 'utf8');
        expect(content).toContain('# Agent Work Log');
        expect(content).toContain('aw task');
        expect(content).toContain('Categories');
      });

      it('should create CLAUDE.md file', async () => {
        await runInstallCli('install --global');

        const claudeMdPath = join(tempClaudeDir, '.claude', 'CLAUDE.md');
        expect(existsSync(claudeMdPath)).toBe(true);

        const content = readFileSync(claudeMdPath, 'utf8');
        expect(content).toContain('# Agent Work Log');
        expect(content).toContain('What to Log');
        expect(content).toContain('--category');
      });

      it('should display success message for global install', async () => {
        const result = await runInstallCli('install --global');

        expect(result.stdout).toContain('Installing Agent Work Log globally');
        expect(result.stdout).toContain('Installation complete');
      });

      it('should not duplicate CLAUDE.md content on second install', async () => {
        await runInstallCli('install --global');
        await runInstallCli('install --global');

        const claudeMdPath = join(tempClaudeDir, '.claude', 'CLAUDE.md');
        const content = readFileSync(claudeMdPath, 'utf8');

        // Should only have one Agent Work Log section (updated in place, not duplicated)
        const matches = content.match(/# Agent Work Log/g);
        expect(matches).toHaveLength(1);
      });

      it('should append to existing CLAUDE.md without overwriting', async () => {
        const claudeMdPath = join(tempClaudeDir, '.claude', 'CLAUDE.md');
        const existingContent = '# Existing Instructions\n\nSome existing content.\n';

        await $`mkdir -p ${join(tempClaudeDir, '.claude')}`;
        await $`echo ${existingContent} > ${claudeMdPath}`;

        await runInstallCli('install --global');

        const content = readFileSync(claudeMdPath, 'utf8');
        expect(content).toContain('Existing Instructions');
        expect(content).toContain('Some existing content');
        expect(content).toContain('Agent Work Log');
      });
    });

    describe('Local Installation', () => {
      let projectDir: string;

      beforeEach(() => {
        projectDir = mkdtempSync(join(tmpdir(), 'project-test-'));
      });

      afterEach(() => {
        if (existsSync(projectDir)) {
          rmSync(projectDir, { recursive: true, force: true });
        }
      });

      it('should create .claude directory in project', async () => {
        await runInstallCli('install', projectDir);

        const claudeDir = join(projectDir, '.claude');
        expect(existsSync(claudeDir)).toBe(true);
      });

      it('should create skill file in project .claude directory', async () => {
        await runInstallCli('install', projectDir);

        const skillPath = join(projectDir, '.claude', 'skills', 'worklog', 'SKILL.md');
        expect(existsSync(skillPath)).toBe(true);

        const content = readFileSync(skillPath, 'utf8');
        expect(content).toContain('# Agent Work Log');
      });

      it('should create CLAUDE.md in project directory', async () => {
        await runInstallCli('install', projectDir);

        const claudeMdPath = join(projectDir, '.claude', 'CLAUDE.md');
        expect(existsSync(claudeMdPath)).toBe(true);

        const content = readFileSync(claudeMdPath, 'utf8');
        expect(content).toContain('# Agent Work Log');
      });

      it('should display success message for local install', async () => {
        const result = await runInstallCli('install', projectDir);

        expect(result.stdout).toContain('Installing Agent Work Log locally');
        expect(result.stdout).toContain('Installation complete');
      });

      it('should install to different projects independently', async () => {
        const project1 = mkdtempSync(join(tmpdir(), 'project1-'));
        const project2 = mkdtempSync(join(tmpdir(), 'project2-'));

        try {
          await runInstallCli('install', project1);
          await runInstallCli('install', project2);

          const skill1 = join(project1, '.claude', 'skills', 'worklog', 'SKILL.md');
          const skill2 = join(project2, '.claude', 'skills', 'worklog', 'SKILL.md');

          expect(existsSync(skill1)).toBe(true);
          expect(existsSync(skill2)).toBe(true);
        } finally {
          rmSync(project1, { recursive: true, force: true });
          rmSync(project2, { recursive: true, force: true });
        }
      });
    });
  });

  describe('Uninstall Command', () => {
    let tempClaudeDir: string;

    beforeEach(() => {
      tempClaudeDir = mkdtempSync(join(tmpdir(), 'claude-test-'));
    });

    afterEach(() => {
      if (existsSync(tempClaudeDir)) {
        rmSync(tempClaudeDir, { recursive: true, force: true });
      }
    });

    const runUninstallCli = async (args: string, cwd?: string) => {
      const projectRoot = process.cwd();
      const env = {
        ...process.env,
        HOME: tempClaudeDir,
      };

      $.env = env;

      if (cwd) {
        const result = await $`cd ${cwd} && tsx ${join(projectRoot, 'bin/aw.ts')} ${args.split(' ')}`;
        return result;
      }

      const result = await $`tsx ${join(projectRoot, 'bin/aw.ts')} ${args.split(' ')}`;
      return result;
    };

    it('should display help for uninstall command', async () => {
      const result = await runUninstallCli('uninstall --help');
      expect(result.stdout).toContain('Remove worklog instructions from AI coding tools');
      expect(result.stdout).toContain('--global');
      expect(result.stdout).toContain('--harness');
    });

    describe('Global Uninstall', () => {
      beforeEach(async () => {
        await runUninstallCli('install --global');
      });

      it('should remove skill file', async () => {
        const skillPath = join(tempClaudeDir, '.claude', 'skills', 'worklog', 'SKILL.md');
        expect(existsSync(skillPath)).toBe(true);

        await runUninstallCli('uninstall --global');

        expect(existsSync(skillPath)).toBe(false);
      });

      it('should remove worklog directory if empty', async () => {
        const worklogDir = join(tempClaudeDir, '.claude', 'skills', 'worklog');
        expect(existsSync(worklogDir)).toBe(true);

        await runUninstallCli('uninstall --global');

        expect(existsSync(worklogDir)).toBe(false);
      });

      it('should remove Agent Work Log section from CLAUDE.md', async () => {
        const claudeMdPath = join(tempClaudeDir, '.claude', 'CLAUDE.md');
        expect(existsSync(claudeMdPath)).toBe(true);
        expect(readFileSync(claudeMdPath, 'utf8')).toContain('# Agent Work Log');

        await runUninstallCli('uninstall --global');

        expect(existsSync(claudeMdPath)).toBe(false);
      });

      it('should preserve other CLAUDE.md content', async () => {
        const claudeMdPath = join(tempClaudeDir, '.claude', 'CLAUDE.md');
        const existingContent = '# My Custom Instructions\n\nSome content here.\n';
        const currentContent = readFileSync(claudeMdPath, 'utf8');
        const combinedContent = existingContent + '\n' + currentContent;
        const { writeFileSync: writeFsSync } = await import('node:fs');
        writeFsSync(claudeMdPath, combinedContent, 'utf8');

        await runUninstallCli('uninstall --global');

        expect(existsSync(claudeMdPath)).toBe(true);
        const afterContent = readFileSync(claudeMdPath, 'utf8');
        expect(afterContent).toContain('My Custom Instructions');
        expect(afterContent).not.toContain('Agent Work Log');
      });

      it('should display success message', async () => {
        const result = await runUninstallCli('uninstall --global');

        expect(result.stdout).toContain('Uninstalling Agent Work Log globally');
        expect(result.stdout).toContain('Uninstallation complete');
      });
    });

    describe('Local Uninstall', () => {
      let projectDir: string;

      beforeEach(async () => {
        projectDir = mkdtempSync(join(tmpdir(), 'project-test-'));
        await runUninstallCli('install', projectDir);
      });

      afterEach(() => {
        if (existsSync(projectDir)) {
          rmSync(projectDir, { recursive: true, force: true });
        }
      });

      it('should remove skill file from project', async () => {
        const skillPath = join(projectDir, '.claude', 'skills', 'worklog', 'SKILL.md');
        expect(existsSync(skillPath)).toBe(true);

        await runUninstallCli('uninstall', projectDir);

        expect(existsSync(skillPath)).toBe(false);
      });

      it('should remove CLAUDE.md section from project', async () => {
        const claudeMdPath = join(projectDir, '.claude', 'CLAUDE.md');
        expect(existsSync(claudeMdPath)).toBe(true);

        await runUninstallCli('uninstall', projectDir);

        expect(existsSync(claudeMdPath)).toBe(false);
      });

      it('should display success message for local uninstall', async () => {
        const result = await runUninstallCli('uninstall', projectDir);

        expect(result.stdout).toContain('Uninstalling Agent Work Log locally');
        expect(result.stdout).toContain('Uninstallation complete');
      });
    });

    describe('Edge Cases', () => {
      it('should handle uninstall when nothing is installed', async () => {
        const emptyDir = mkdtempSync(join(tmpdir(), 'empty-project-'));

        try {
          const result = await runUninstallCli('uninstall', emptyDir);
          // Falls back to AGENTS.md when no harnesses detected
          expect(result.stdout).toContain('not found');
        } finally {
          rmSync(emptyDir, { recursive: true, force: true });
        }
      });

      it('should handle double uninstall gracefully', async () => {
        await runUninstallCli('install --global');
        await runUninstallCli('uninstall --global');

        const result = await runUninstallCli('uninstall --global');
        expect(result.stdout).toContain('already removed');
      });
    });
  });
});

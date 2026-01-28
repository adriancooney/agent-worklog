import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { homedir } from 'node:os';
import { join, basename, dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { workEntries, type NewWorkEntry } from './schema.js';
import { getSessionId } from './harnesses/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getConfigDir(): string {
  return process.env.AW_CONFIG_DIR ?? join(homedir(), '.aw');
}

function getDbPath(): string {
  return join(getConfigDir(), 'worklog.db');
}

export interface TaskMetadata {
  sessionId?: string;
  category?: string;
  projectName?: string;
  gitBranch?: string | null;
  workingDirectory: string;
}

function getGitBranch(cwd: string): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function getGitRepoName(cwd: string): string | null {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    const match = remoteUrl.match(/\/([^\/]+?)(\.git)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function getProjectName(cwd: string): string {
  const gitRepo = getGitRepoName(cwd);
  if (gitRepo) return gitRepo;

  return basename(cwd);
}

export function collectMetadata(cwd: string): TaskMetadata {
  return {
    sessionId: getSessionId() ?? undefined,
    projectName: getProjectName(cwd),
    gitBranch: getGitBranch(cwd),
    workingDirectory: cwd,
  };
}

function initDatabase() {
  try {
    const dbDir = getConfigDir();
    const dbPath = getDbPath();
    const isNewDatabase = !existsSync(dbPath);

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite);

    // Only run migrations if this is a new database
    if (isNewDatabase) {
      const migrationsPath = join(__dirname, '..', 'drizzle');
      migrate(db, { migrationsFolder: migrationsPath });
    }

    return { db, sqlite };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
    throw error;
  }
}

export function logTask(
  timestamp: string,
  description: string,
  metadata: TaskMetadata
): void {
  const { db, sqlite } = initDatabase();

  try {
    const entry: NewWorkEntry = {
      timestamp,
      taskDescription: description,
      sessionId: metadata.sessionId ?? null,
      category: metadata.category ?? null,
      projectName: metadata.projectName ?? null,
      gitBranch: metadata.gitBranch ?? null,
      workingDirectory: metadata.workingDirectory,
    };

    db.insert(workEntries).values(entry).run();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to log task: ${error.message}`);
    }
    throw error;
  } finally {
    sqlite.close();
  }
}

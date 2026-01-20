import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { workEntries, type WorkEntry } from './schema';
import { desc, sql, gte, and } from 'drizzle-orm';

function getDbPath(): string {
  const configDir = process.env.AW_CONFIG_DIR ?? join(homedir(), '.aw');
  return join(configDir, 'worklog.db');
}

function getDb() {
  const dbPath = getDbPath();
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);
  return { db, sqlite };
}

export interface WorkLogQueryOptions {
  limit?: number;
  offset?: number;
  category?: string;
  projectName?: string;
  sessionId?: string;
  daysBack?: number;
}

export interface WorkLogResult {
  entries: WorkEntry[];
  total: number;
}

export function getWorkEntries(options: WorkLogQueryOptions = {}): WorkLogResult {
  const { db, sqlite } = getDb();

  try {
    const {
      limit = 50,
      offset = 0,
      category,
      projectName,
      sessionId,
      daysBack,
    } = options;

    const conditions: any[] = [];

    if (category) {
      conditions.push(sql`${workEntries.category} = ${category}`);
    }

    if (projectName) {
      conditions.push(sql`${workEntries.projectName} = ${projectName}`);
    }

    if (sessionId) {
      conditions.push(sql`${workEntries.sessionId} = ${sessionId}`);
    }

    if (daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffTimestamp = cutoffDate.toISOString();
      conditions.push(sql`${workEntries.timestamp} >= ${cutoffTimestamp}`);
    }

    const baseQuery = db.select().from(workEntries);
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const entries = whereCondition
      ? baseQuery
          .where(whereCondition)
          .orderBy(desc(workEntries.timestamp))
          .limit(limit)
          .offset(offset)
          .all()
      : baseQuery
          .orderBy(desc(workEntries.timestamp))
          .limit(limit)
          .offset(offset)
          .all();

    const countQuery = db.select({ count: sql<number>`count(*)` }).from(workEntries);
    const result = whereCondition ? countQuery.where(whereCondition).get() : countQuery.get();
    const total = result?.count ?? 0;

    return {
      entries,
      total,
    };
  } finally {
    sqlite.close();
  }
}

export function getRecentEntries(daysBack: number = 7, limit: number = 100): WorkEntry[] {
  const { db, sqlite } = getDb();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffTimestamp = cutoffDate.toISOString();

    const entries = db
      .select()
      .from(workEntries)
      .where(gte(workEntries.timestamp, cutoffTimestamp))
      .orderBy(desc(workEntries.timestamp))
      .limit(limit)
      .all();

    return entries;
  } finally {
    sqlite.close();
  }
}

export function getCategories(): string[] {
  const { db, sqlite } = getDb();

  try {
    const results = db
      .selectDistinct({ category: workEntries.category })
      .from(workEntries)
      .where(sql`${workEntries.category} IS NOT NULL`)
      .all();

    return results.map((r) => r.category).filter((c): c is string => c !== null);
  } finally {
    sqlite.close();
  }
}

export function getProjects(): string[] {
  const { db, sqlite } = getDb();

  try {
    const results = db
      .selectDistinct({ projectName: workEntries.projectName })
      .from(workEntries)
      .where(sql`${workEntries.projectName} IS NOT NULL`)
      .all();

    return results.map((r) => r.projectName).filter((p): p is string => p !== null);
  } finally {
    sqlite.close();
  }
}

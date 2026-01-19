import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const workEntries = sqliteTable(
  'work_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    timestamp: text('timestamp').notNull(),
    taskDescription: text('task_description').notNull(),
    sessionId: text('session_id'),
    category: text('category'),
    projectName: text('project_name'),
    gitBranch: text('git_branch'),
    workingDirectory: text('working_directory'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    timestampIdx: index('idx_timestamp').on(table.timestamp),
    sessionIdIdx: index('idx_session_id').on(table.sessionId),
    categoryIdx: index('idx_category').on(table.category),
    projectNameIdx: index('idx_project_name').on(table.projectName),
  })
);

export type WorkEntry = typeof workEntries.$inferSelect;
export type NewWorkEntry = typeof workEntries.$inferInsert;

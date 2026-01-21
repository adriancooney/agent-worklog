import { query } from '@anthropic-ai/claude-agent-sdk';
import { getWorkEntries, type WorkLogQueryOptions } from './queries.js';
import type { WorkEntry } from './schema.js';

export interface SummaryOptions {
  daysBack?: number;
  category?: string;
  projectName?: string;
}

export interface SummaryResult {
  summary: string;
  entriesCount: number;
  daysBack: number;
}

function formatEntriesForPrompt(entries: WorkEntry[]): string {
  return entries
    .map((entry) => {
      const category = entry.category ? ` [${entry.category}]` : '';
      const project = entry.projectName ? ` (${entry.projectName})` : '';
      const date = new Date(entry.timestamp).toLocaleDateString();
      return `- ${date}${project}${category}: ${entry.taskDescription}`;
    })
    .join('\n');
}

export async function generateSummary(options: SummaryOptions = {}): Promise<SummaryResult> {
  const daysBack = options.daysBack ?? 7;

  const queryOptions: WorkLogQueryOptions = {
    daysBack,
    limit: 500,
  };

  if (options.category) {
    queryOptions.category = options.category;
  }

  if (options.projectName) {
    queryOptions.projectName = options.projectName;
  }

  const { entries } = getWorkEntries(queryOptions);

  if (entries.length === 0) {
    return {
      summary: 'No work entries found for the specified time period.',
      entriesCount: 0,
      daysBack,
    };
  }

  const entriesText = formatEntriesForPrompt(entries);

  const filterContext = [];
  if (options.category) {
    filterContext.push(`category "${options.category}"`);
  }
  if (options.projectName) {
    filterContext.push(`project "${options.projectName}"`);
  }
  const filterNote = filterContext.length > 0
    ? ` (filtered by ${filterContext.join(' and ')})`
    : '';

  const prompt = `You are analyzing a work log from an AI agent. Provide a concise summary of the work completed in the last ${daysBack} days${filterNote}.

Work entries:
${entriesText}

Structure your response in two parts separated by "---" on its own line:

1. FIRST: A brief 1-2 sentence overview (no title/heading, just the text)
2. THEN: "---" separator on its own line
3. FINALLY: Detailed breakdown with key accomplishments grouped by theme (no main title, just start with the content or subheadings)

IMPORTANT: Do NOT include any title like "Overview", "Summary", or "Work Summary" at the start. Just start directly with the content.

Example format:
Completed 15 tasks focusing on authentication and API improvements. Major accomplishments include JWT implementation and database optimization.

---

**Authentication & Security**
- Implemented JWT with refresh tokens
- Added rate limiting

**Performance**
- Optimized database queries`;

  let summary = '';

  for await (const msg of query({
    prompt,
    options: {
      allowedTools: [],
      settingSources: ['user'],
    },
  })) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if ('text' in block && block.text) {
          summary += block.text;
        }
      }
    }
  }

  return {
    summary: summary.trim(),
    entriesCount: entries.length,
    daysBack,
  };
}

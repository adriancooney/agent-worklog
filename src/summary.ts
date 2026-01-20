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

  const prompt = `You are analyzing a work log from an AI agent. Please provide a concise summary of the work completed in the last ${daysBack} days${filterNote}. Group the work by themes or categories, and highlight key accomplishments.

Work entries:
${entriesText}

Provide a well-structured summary with:
1. Overview of total work done
2. Key accomplishments grouped by theme
3. Notable patterns or insights`;

  let summary = '';

  for await (const msg of query({
    prompt,
    options: {
      allowedTools: [],
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

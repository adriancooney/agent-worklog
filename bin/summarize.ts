#!/usr/bin/env tsx

import { query } from '@anthropic-ai/claude-agent-sdk';
import { getRecentEntries } from '../src/queries.js';

async function main() {
  const daysBack = parseInt(process.argv[2] || '7', 10);

  const entries = getRecentEntries(daysBack);

  if (entries.length === 0) {
    console.log(JSON.stringify({
      summary: 'No work entries found for the specified time period.',
      entriesCount: 0,
      daysBack,
    }));
    process.exit(0);
  }

  const entriesText = entries
    .map((entry) => {
      const category = entry.category ? ` [${entry.category}]` : '';
      const project = entry.projectName ? ` (${entry.projectName})` : '';
      const date = new Date(entry.timestamp).toLocaleDateString();
      return `- ${date}${project}${category}: ${entry.taskDescription}`;
    })
    .join('\n');

  const prompt = `You are analyzing a work log from an AI agent. Please provide a concise summary of the work completed in the last ${daysBack} days. Group the work by themes or categories, and highlight key accomplishments.

Work entries:
${entriesText}

Provide a well-structured summary with:
1. Overview of total work done
2. Key accomplishments grouped by theme
3. Notable patterns or insights`;

  let summary = '';

  try {
    for await (const msg of query({
      prompt,
      options: {
        allowedTools: [],
        workingDir: process.cwd(),
        settingSources: ["user"],
      }
    })) {
      if (msg.type === 'assistant' && msg.message?.content) {
        for (const block of msg.message.content) {
          if ('text' in block && block.text) {
            summary += block.text;
          }
        }
      }
    }

    console.log(JSON.stringify({
      summary: summary.trim(),
      entriesCount: entries.length,
      daysBack,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
});

#!/usr/bin/env tsx

import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logTask, collectMetadata } from '../src/db.js';
import { install } from '../src/install.js';
import { generateSummary } from '../src/summary.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');

const program = new Command();

program
  .name('aw')
  .description('Agent Work Log - Track your work activities')
  .version('0.1.0');

program
  .command('task')
  .description('Log a completed task')
  .argument('<description>', 'Description of the task')
  .option('-c, --category <category>', 'Category: feature, bugfix, refactor, docs, config, test, perf, infra, security')
  .action((description: string, options: { category?: string }) => {
    try {
      const timestamp = new Date().toISOString();
      const metadata = collectMetadata(process.cwd());

      if (options.category) {
        metadata.category = options.category;
      }

      logTask(timestamp, description, metadata);

      const categoryInfo = metadata.category ? ` [${metadata.category}]` : '';
      console.log(`✓ Logged: ${description}${categoryInfo}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

program
  .command('install')
  .description('Install worklog skill and instructions for Claude Code')
  .option('-g, --global', 'Install globally to ~/.claude/ instead of local ./.claude/')
  .action((options: { global?: boolean }) => {
    try {
      const isGlobal = options.global ?? false;
      install(isGlobal);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

interface SummaryOptions {
  days?: string;
  category?: string;
  project?: string;
  json?: boolean;
}

program
  .command('summary')
  .description('Generate an AI summary of work entries')
  .option('-d, --days <number>', 'Number of days to look back', '7')
  .option('-c, --category <category>', 'Filter by category')
  .option('-p, --project <project>', 'Filter by project name')
  .option('--json', 'Output raw JSON instead of formatted text')
  .action(async (options: SummaryOptions) => {
    try {
      const daysBack = parseInt(options.days ?? '7', 10);

      if (isNaN(daysBack) || daysBack < 1) {
        console.error('Error: --days must be a positive number');
        process.exit(1);
      }

      if (!options.json) {
        const filterInfo = [];
        if (options.category) filterInfo.push(`category: ${options.category}`);
        if (options.project) filterInfo.push(`project: ${options.project}`);
        const filterStr = filterInfo.length > 0 ? ` (${filterInfo.join(', ')})` : '';
        console.log(`Generating summary for the last ${daysBack} days${filterStr}...\n`);
      }

      const result = await generateSummary({
        daysBack,
        category: options.category,
        projectName: options.project,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.summary);
        console.log(`\n---\n${result.entriesCount} entries analyzed`);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

interface WebOptions {
  port?: string;
}

program
  .command('web')
  .description('Start the web interface for browsing work logs')
  .option('-p, --port <number>', 'Port to run on', '3000')
  .action((options: WebOptions) => {
    const port = options.port ?? '3000';

    console.log(`Starting work log viewer on http://localhost:${port}`);
    console.log('Press Ctrl+C to stop\n');

    const next = spawn('npx', ['next', 'dev', '-p', port], {
      cwd: packageRoot,
      stdio: 'inherit',
      shell: true,
    });

    next.on('error', (error) => {
      console.error(`Error starting server: ${error.message}`);
      process.exit(1);
    });

    next.on('close', (code) => {
      process.exit(code ?? 0);
    });
  });

program.parse();

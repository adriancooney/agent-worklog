#!/usr/bin/env tsx

import { Command } from 'commander';
import { logTask, collectMetadata } from '../src/db.js';
import { install } from '../src/install.js';

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

program.parse();

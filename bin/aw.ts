import { Command } from 'commander';
import { exec } from 'node:child_process';
import { logTask, collectMetadata } from '../src/db.js';
import { install, uninstall } from '../src/install.js';
import { generateSummary } from '../src/summary.js';
import { startServer } from '../src/server.js';

const WEBAPP_URL = process.env.AW_WEBAPP_URL ?? 'https://agent-worklog.vercel.app';

const program = new Command();

program
  .name('aw')
  .description('Agent Work Log - Track your work activities')
  .version('0.1.0');

program
  .command('task')
  .description('Log a completed task')
  .argument('<description>', 'Description of the task')
  .option('-c, --category <category>', 'Category: feature, bugfix, refactor, docs, config, test, perf, infra, security, research')
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

program
  .command('uninstall')
  .description('Remove worklog skill and instructions from Claude Code')
  .option('-g, --global', 'Uninstall globally from ~/.claude/ instead of local ./.claude/')
  .action((options: { global?: boolean }) => {
    try {
      const isGlobal = options.global ?? false;
      uninstall(isGlobal);
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
  host?: string;
  noBrowser?: boolean;
}

function openBrowser(url: string): void {
  const command =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  exec(`${command} "${url}"`);
}

// Hooks subcommands for Claude Code integration
const hooks = program.command('hooks').description('Claude Code hook commands');

hooks
  .command('remind')
  .description('Output worklog reminder for UserPromptSubmit hook')
  .action(() => {
    const output = {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: 'Worklog: Log completed work with aw task "description" --category <category>',
      },
    };
    console.log(JSON.stringify(output));
  });

program
  .command('web')
  .description('Start local API server and open web interface')
  .option('-p, --port <number>', 'Port for local API server', '24377')
  .option('--host <url>', 'Custom webapp URL (e.g., http://localhost:3000)')
  .option('--no-browser', 'Do not open browser automatically')
  .action(async (options: WebOptions) => {
    const port = parseInt(options.port ?? '24377', 10);
    const hostUrl = options.host ?? WEBAPP_URL;

    try {
      const server = await startServer({ port });
      const webappUrl = `${hostUrl}?port=${port}&token=${server.token}`;

      console.log(`Local API server running on http://localhost:${port}\n`);
      console.log(`Open: ${webappUrl}\n`);

      if (options.noBrowser !== true) {
        openBrowser(webappUrl);
      }

      console.log('Press Ctrl+C to stop');

      process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await server.close();
        process.exit(0);
      });
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

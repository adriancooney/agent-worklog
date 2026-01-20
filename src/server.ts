import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { URL } from 'node:url';
import { getWorkEntries, getCategories, getProjects } from './queries.js';
import { generateSummary } from './summary.js';

export interface ServerOptions {
  port: number;
  hostname?: string;
}

export interface ServerInstance {
  token: string;
  port: number;
  close: () => Promise<void>;
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  });
  res.end(JSON.stringify(data));
}

function unauthorized(res: ServerResponse): void {
  json(res, { error: 'Unauthorized' }, 401);
}

function notFound(res: ServerResponse): void {
  json(res, { error: 'Not found' }, 404);
}

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export function startServer(options: ServerOptions): Promise<ServerInstance> {
  const { port, hostname = '127.0.0.1' } = options;
  const token = generateToken();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${hostname}:${port}`);
    const path = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      });
      res.end();
      return;
    }

    // Health check (no auth)
    if (path === '/health') {
      json(res, { ok: true });
      return;
    }

    // Validate token
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const tokenFromQuery = url.searchParams.get('token');
    const providedToken = tokenFromHeader ?? tokenFromQuery;

    if (providedToken !== token) {
      unauthorized(res);
      return;
    }

    try {
      // GET /api/worklog
      if (path === '/api/worklog' && req.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
        const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
        const category = url.searchParams.get('category') ?? undefined;
        const projectName = url.searchParams.get('projectName') ?? undefined;
        const sessionId = url.searchParams.get('sessionId') ?? undefined;
        const daysBack = url.searchParams.get('daysBack')
          ? parseInt(url.searchParams.get('daysBack')!, 10)
          : undefined;

        const result = getWorkEntries({ limit, offset, category, projectName, sessionId, daysBack });
        const categories = getCategories();
        const projects = getProjects();

        json(res, { ...result, categories, projects });
        return;
      }

      // POST /api/summary
      if (path === '/api/summary' && req.method === 'POST') {
        const body = await parseBody(req);
        const { daysBack = 7, category, projectName } = JSON.parse(body || '{}');

        const result = await generateSummary({ daysBack, category, projectName });
        json(res, result);
        return;
      }

      notFound(res);
    } catch (error) {
      json(res, { error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, hostname, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;

      resolve({
        token,
        port: actualPort,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, type ServerInstance } from '../src/server.js';
import { logTask, collectMetadata } from '../src/db.js';

describe('API Server', () => {
  let testConfigDir: string;
  let server: ServerInstance;

  beforeAll(async () => {
    testConfigDir = mkdtempSync(join(tmpdir(), 'aw-server-test-'));
    process.env.AW_CONFIG_DIR = testConfigDir;

    const metadata = collectMetadata(process.cwd());
    logTask(new Date().toISOString(), 'Test entry 1', { ...metadata, category: 'feature' });
    logTask(new Date().toISOString(), 'Test entry 2', { ...metadata, category: 'bugfix' });
    logTask(new Date().toISOString(), 'Test entry 3', { ...metadata, category: 'feature' });

    server = await startServer({ port: 0, hostname: '127.0.0.1' });
  });

  afterAll(async () => {
    await server.close();
    delete process.env.AW_CONFIG_DIR;
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  const fetchApi = async (
    path: string,
    options: { method?: string; body?: unknown; token?: string | null } = {}
  ) => {
    const { method = 'GET', body, token = server.token } = options;
    const url = new URL(path, `http://127.0.0.1:${server.port}`);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return {
      status: response.status,
      data: await response.json(),
    };
  };

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const { status, data } = await fetchApi('/api/worklog', { token: null });
      expect(status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid token', async () => {
      const { status, data } = await fetchApi('/api/worklog', { token: 'invalid-token' });
      expect(status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should accept requests with valid token in header', async () => {
      const { status, data } = await fetchApi('/api/worklog');
      expect(status).toBe(200);
      expect(data.entries).toBeDefined();
    });

    it('should accept requests with valid token in query string', async () => {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/worklog?token=${server.token}`
      );
      expect(response.status).toBe(200);
    });

    it('should allow health check without auth', async () => {
      const { status, data } = await fetchApi('/health', { token: null });
      expect(status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });

  describe('CORS', () => {
    it('should handle preflight OPTIONS request', async () => {
      const response = await fetch(`http://127.0.0.1:${server.port}/api/worklog`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    });

    it('should include CORS headers in responses', async () => {
      const response = await fetch(`http://127.0.0.1:${server.port}/api/worklog`, {
        headers: { Authorization: `Bearer ${server.token}` },
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('GET /api/worklog', () => {
    it('should return work entries', async () => {
      const { status, data } = await fetchApi('/api/worklog');

      expect(status).toBe(200);
      expect(data.entries).toBeInstanceOf(Array);
      expect(data.entries.length).toBeGreaterThan(0);
      expect(data.total).toBeGreaterThan(0);
    });

    it('should return categories and projects', async () => {
      const { status, data } = await fetchApi('/api/worklog');

      expect(status).toBe(200);
      expect(data.categories).toBeInstanceOf(Array);
      expect(data.projects).toBeInstanceOf(Array);
      expect(data.categories).toContain('feature');
      expect(data.categories).toContain('bugfix');
    });

    it('should support limit parameter', async () => {
      const { status, data } = await fetchApi('/api/worklog?limit=1');

      expect(status).toBe(200);
      expect(data.entries.length).toBe(1);
    });

    it('should support category filter', async () => {
      const { status, data } = await fetchApi('/api/worklog?category=feature');

      expect(status).toBe(200);
      expect(data.entries.every((e: any) => e.category === 'feature')).toBe(true);
    });

    it('should support daysBack filter', async () => {
      const { status, data } = await fetchApi('/api/worklog?daysBack=1');

      expect(status).toBe(200);
      expect(data.entries).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/summary', () => {
    it('should return summary for entries', async () => {
      const { status, data } = await fetchApi('/api/summary', {
        method: 'POST',
        body: { daysBack: 7 },
      });

      expect(status).toBe(200);
      expect(data.summary).toBeDefined();
      expect(typeof data.summary).toBe('string');
      expect(data.entriesCount).toBeGreaterThan(0);
      expect(data.daysBack).toBe(7);
    }, 30000);

    it('should support category filter in summary', async () => {
      const { status, data } = await fetchApi('/api/summary', {
        method: 'POST',
        body: { daysBack: 7, category: 'feature' },
      });

      expect(status).toBe(200);
      expect(data.summary).toBeDefined();
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const { status, data } = await fetchApi('/api/unknown');

      expect(status).toBe(404);
      expect(data.error).toBe('Not found');
    });
  });

  describe('Token Generation', () => {
    it('should generate unique tokens for each server instance', async () => {
      const server2 = await startServer({ port: 0, hostname: '127.0.0.1' });

      expect(server.token).not.toBe(server2.token);
      expect(server.token.length).toBe(64); // 32 bytes = 64 hex chars

      await server2.close();
    });
  });
});

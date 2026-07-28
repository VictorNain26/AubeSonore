import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// env.ts validates at import time and bun caches modules, so each case runs in
// its own process. The cwd is a scratch directory on purpose: bun auto-loads a
// .env from the cwd, and apps/backend/.env sets DISABLE_EMAILS, which would
// mask the very guard under test.
const ENV_MODULE = new URL('./env.ts', import.meta.url).pathname;

const BASE = {
  PATH: process.env.PATH ?? '',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'https://api.example.test',
};

let cwd: string;

beforeAll(() => {
  cwd = mkdtempSync(join(tmpdir(), 'aubesonore-env-'));
});

afterAll(() => {
  rmSync(cwd, { recursive: true, force: true });
});

async function loadEnv(
  overrides: Record<string, string>
): Promise<{ ok: boolean; stderr: string }> {
  const proc = Bun.spawn(['bun', '-e', `await import(${JSON.stringify(ENV_MODULE)})`], {
    cwd,
    env: { ...BASE, ...overrides },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  return { ok: code === 0, stderr };
}

describe('production email configuration', () => {
  it('refuses to start when mail is enabled but no transport is configured', async () => {
    const { ok, stderr } = await loadEnv({ NODE_ENV: 'production' });

    expect(ok).toBe(false);
    expect(stderr).toContain('SMTP_HOST is required in production');
  });

  it('starts when the operator explicitly accepts having no mail', async () => {
    const { ok } = await loadEnv({ NODE_ENV: 'production', DISABLE_EMAILS: 'true' });

    expect(ok).toBe(true);
  });

  it('starts once a transport is configured', async () => {
    const { ok } = await loadEnv({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.test',
      SMTP_USER: 'user',
      SMTP_PASSWORD: 'secret',
    });

    expect(ok).toBe(true);
  });

  it('leaves development alone', async () => {
    const { ok } = await loadEnv({ NODE_ENV: 'development' });

    expect(ok).toBe(true);
  });
});

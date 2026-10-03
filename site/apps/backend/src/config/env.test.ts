import { describe, expect, it } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// config/env validates at import, in a frozen singleton: the guard is tested
// as it runs in production, by booting a process that imports the module.
function importEnv(extra: Record<string, string>) {
  return Bun.spawnSync({
    cmd: [
      process.execPath,
      '-e',
      `await import(${JSON.stringify(join(import.meta.dir, 'env.ts'))})`,
    ],
    env: {
      PATH: process.env.PATH ?? '',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      BETTER_AUTH_SECRET: 'x'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3000',
      ...extra,
    },
    stderr: 'pipe',
  });
}

describe('database TLS', () => {
  it('refuses TLS without a CA to verify the server against', () => {
    const result = importEnv({ DATABASE_SSL: 'true' });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain('refusing unverified TLS');
  });

  it('boots with TLS when the CA is given as a file', () => {
    const ca = join(mkdtempSync(join(tmpdir(), 'ca-')), 'ca.crt');
    writeFileSync(ca, '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n');

    expect(importEnv({ DATABASE_SSL: 'true', DATABASE_CA_CERT_FILE: ca }).exitCode).toBe(0);
  });

  it('boots without TLS for a local plain Postgres', () => {
    expect(importEnv({ DATABASE_SSL: 'false' }).exitCode).toBe(0);
  });
});

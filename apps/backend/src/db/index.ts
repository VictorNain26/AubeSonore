import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

/**
 * TLS policy:
 * - dev: no TLS (local Postgres is plain).
 * - prod with DATABASE_CA_CERT set: full verification against the supplied CA.
 *   Recommended for hardened deployments. Railway, Supabase, Neon and similar
 *   providers expose their CA via dashboard/API.
 * - prod without DATABASE_CA_CERT: TLS encryption is still enforced via the
 *   connection string (most managed Postgres force this), but the server cert
 *   is accepted without local verification. This is the documented Railway/
 *   Heroku posture — their internal certs are self-signed and not exposed.
 *   Acceptable tradeoff for now; the connection is encrypted in transit.
 */
const sslConfig = env.IS_PROD
  ? env.DATABASE_CA_CERT
    ? { rejectUnauthorized: true, ca: env.DATABASE_CA_CERT }
    : { rejectUnauthorized: false }
  : false;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Kill any single query that exceeds 5s server-side, abort client-side at 10s.
  // Without these a hung query (network blip, lock contention, bad plan) would
  // hold a pool slot indefinitely and exhaust the pool under load.
  statement_timeout: 5_000,
  query_timeout: 10_000,
  ssl: sslConfig,
});

export const db = drizzle(pool, { schema });
export { schema };

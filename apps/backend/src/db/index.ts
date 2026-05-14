import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Railway / managed Postgres providers require TLS. Enforce it explicitly
  // in production rather than relying on `?sslmode=require` being present
  // in the connection string. Local dev defaults to no SSL.
  ssl: env.IS_PROD ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
export { schema };

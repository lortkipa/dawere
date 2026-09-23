import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
}

// Next dev reloads modules on every edit; cache the pool on globalThis so we do
// not leak a connection pool per reload.
const globalForDb = globalThis as unknown as { __dawereSql?: ReturnType<typeof postgres> };

const client =
  globalForDb.__dawereSql ??
  postgres(connectionString, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.__dawereSql = client;

export const db = drizzle(client, { schema });
export { client as sql };
export * from './schema';

/**
 * Postgres unique_violation (23505). Drizzle wraps driver errors, so the code
 * sits on `cause` for query-builder calls and on the error itself for raw ones.
 */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

/**
 * Applies db/schema.sql. `npm run db:setup` to create or update the schema,
 * `npm run db:reset` to drop everything first.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
// onnotice: an idempotent re-run otherwise prints every "already exists, skipping".
const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main() {
  if (process.argv.includes('--reset')) {
    console.log('Dropping public schema…');
    await sql.unsafe('drop schema public cascade; create schema public;').simple();
  }

  const ddl = await readFile(join(here, 'schema.sql'), 'utf8');
  await sql.unsafe(ddl).simple();

  const [{ count }] = await sql<{ count: string }[]>`
    select count(*) from information_schema.tables where table_schema = 'public'`;
  console.log(`Schema ready (${count} tables).`);
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});

/**
 * Sets a new password for one account and signs it out everywhere:
 * `npm run user:reset-password -- someone@example.com`.
 *
 * Dawere sends no email, so a forgotten password is recovered by hand: the
 * person writes to SUPPORT_EMAIL, an operator runs this, and the printed
 * password is passed on privately. The person should change it in Settings.
 * It is generated rather than taken as an argument so it never lands in shell
 * history.
 */
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}

const email = process.argv.slice(2).find((arg) => !arg.startsWith('-'))?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run user:reset-password -- <email>');
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main(email: string) {
  // Matches BCRYPT_ROUNDS in src/lib/auth.ts.
  const password = randomBytes(12).toString('base64url');
  const hash = await bcrypt.hash(password, 12);

  const [user] = await sql<{ id: string; username: string }[]>`
    update users set password_hash = ${hash}
    where email = ${email}
    returning id, username`;

  if (!user) {
    console.error(`No account uses ${email}.`);
    process.exitCode = 1;
    return;
  }

  const ended = await sql`delete from sessions where user_id = ${user.id}`;
  console.log(`Password reset for @${user.username} (${email}); ${ended.count} session(s) ended.`);
  console.log(`\n  New password: ${password}\n`);
  console.log('Pass it on privately and ask them to change it in Settings → Account.');
}

main(email)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());

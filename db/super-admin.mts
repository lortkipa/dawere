/**
 * Gives the single super admin seat to an existing account:
 * `npm run admin:super -- someone@example.com`.
 *
 * The web path is /admin/team, where the current super admin hands it on. This
 * is for when that is impossible: the super admin lost their password, left,
 * or deleted their account. Whoever held the seat stays an admin.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}

const email = process.argv.slice(2).find((arg) => !arg.startsWith('-'))?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:super -- <email>');
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main(email: string) {
  const [user] = await sql<{ id: string; username: string; access: string; suspended_at: Date | null }[]>`
    select id, username, access, suspended_at from users where email = ${email}`;

  if (!user) {
    console.error(`No account uses ${email}. It has to sign up first.`);
    process.exitCode = 1;
    return;
  }
  if (user.access === 'super_admin') {
    console.log(`@${user.username} is already the super admin.`);
    return;
  }

  // Demote first: the database allows only one super admin at a time.
  const previous = await sql.begin(async (tx) => {
    const demoted = await tx<{ username: string }[]>`
      update users set access = 'admin' where access = 'super_admin' returning username`;
    await tx`update users set access = 'super_admin', suspended_at = null, suspended_reason = '' where id = ${user.id}`;
    return demoted[0]?.username;
  });

  console.log(`@${user.username} (${email}) is now the super admin.`);
  if (previous) console.log(`@${previous} stays an admin.`);
  if (user.suspended_at) console.log('The account was suspended; that has been lifted.');
}

main(email)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());

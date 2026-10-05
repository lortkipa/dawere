import "server-only";
import { alias } from "drizzle-orm/pg-core";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { bans, sessions, users } from "./db/schema";

export { maxBanReason } from "./ban-rules";

// For queries that join `users`: true unless the account's email is banned. Spelled out with the
// table, so inside the subquery "email" can't mean bans.email.
export const notBanned = sql`not exists (select 1 from bans b where b.email = ${users}.email)`;

export const isBannedSql = sql<boolean>`exists (select 1 from bans b where b.email = ${users}.email)`;

export async function isBanned(email: string) {
  const [row] = await db.select({ email: bans.email }).from(bans).where(eq(bans.email, email)).limit(1);
  return Boolean(row);
}

export async function getBan(email: string) {
  const [row] = await db
    .select({ reason: bans.reason, createdAt: bans.createdAt, byName: users.name, byHandle: users.handle })
    .from(bans)
    .leftJoin(users, eq(users.id, bans.bannedBy))
    .where(eq(bans.email, email))
    .limit(1);
  return row ?? null;
}

// Blocks the address and signs its account out everywhere. Banning again only updates the note.
export async function ban(email: string, reason: string, actorId: string) {
  await db.transaction(async (tx) => {
    await tx
      .insert(bans)
      .values({ email, reason: reason || null, bannedBy: actorId })
      .onConflictDoUpdate({ target: bans.email, set: { reason: reason || null } });
    await tx
      .delete(sessions)
      .where(sql`${sessions.userId} in (select id from users where email = ${email})`);
  });
}

export async function unban(email: string) {
  await db.delete(bans).where(eq(bans.email, email));
}

const account = alias(users, "account");
const banner = alias(users, "banner");

// Every banned address for /admin/users/bans, newest first, with its account if it still has one.
export async function listBans(page: number, pageSize: number) {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        email: bans.email,
        reason: bans.reason,
        createdAt: bans.createdAt,
        accountId: account.id,
        accountName: account.name,
        accountHandle: account.handle,
        accountAvatar: account.avatar,
        accountRole: account.role,
        byId: banner.id,
        byName: banner.name,
        byHandle: banner.handle,
      })
      .from(bans)
      .leftJoin(account, eq(account.email, bans.email))
      .leftJoin(banner, eq(banner.id, bans.bannedBy))
      .orderBy(desc(bans.createdAt), desc(bans.email))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(bans),
  ]);
  return { rows, total };
}

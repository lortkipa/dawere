import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

/** The signed-in person, as every top bar needs them. */
export type Account = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  handle: string;
};

/**
 * Read from the row rather than from the session: the JWT is minted once, at
 * sign-in, and never updated, so a name or an address changed in /settings would
 * otherwise stay stale in the top bar until the next sign-in. `cache` holds that
 * to one query per render however many components ask for it.
 *
 * Auth.js leaves every profile field nullable; the email is the identity, so it
 * is the one thing always worth falling back to.
 */
export const currentAccount = cache(async (): Promise<Account | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const row = await db.query.users.findFirst({
    columns: { id: true, name: true, email: true, image: true, handle: true },
    where: eq(users.id, session.user.id),
  });

  // A signed cookie outlives the row it names: someone who deleted their account
  // in another tab still carries one. No row, nobody signed in.
  if (!row) return null;

  return { ...row, name: row.name?.trim() || row.email };
});

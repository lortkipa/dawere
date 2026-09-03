import NextAuth, { type DefaultSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { handleFor } from "@/lib/handle";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

const drizzleAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
});

/**
 * Auth.js writes only the columns it defined, and `users.handle` is ours — a
 * NOT NULL column it would never fill. The insert happens here rather than in
 * the adapter because the handle is derived from the row id, and the adapter
 * leaves that id to Drizzle: there would be no moment at which both are in hand.
 *
 * The id Auth.js passes is the provider's own — Google's `sub` — which is why
 * the adapter drops it too. Ours goes in after the spread, and the same value
 * makes the handle, so the address stays recomputable from the row.
 */
const adapter: Adapter = {
  ...drizzleAdapter,
  createUser: async (user) => {
    const id = crypto.randomUUID();
    const [localPart] = user.email.split("@");

    const [created] = await db
      .insert(users)
      .values({
        ...user,
        id,
        // OAuth need not give us a name at all; the email is what is left.
        handle: handleFor(user.name || localPart, id),
      })
      .returning();

    return created;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: { strategy: "jwt" },
  providers: [
    Google({
      // Match users on their verified email rather than on the provider account,
      // so a Facebook sign-in later reuses the row Google created instead of
      // failing with OAuthAccountNotLinked. Auth.js only inserts an `accounts`
      // row in that case — the existing name and image are left alone.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    // `user` is only present on the sign-in call; afterwards the id rides along
    // in the token, so no request ever needs to hit the database for it. Nothing
    // else goes in: a name or an avatar cached in the token would still be the
    // sign-in's copy long after /settings had changed it.
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    // Errors (a denied consent screen, say) land back on the landing page
    // rather than on Auth.js's own unstyled English page.
    signIn: "/",
    error: "/",
  },
});

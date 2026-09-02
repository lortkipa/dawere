import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
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
    // in the token, so no request ever needs to hit the database.
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

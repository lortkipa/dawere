"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { emailPattern, normalizeEmail } from "@/lib/profile-rules";
import { authUrl, safeNext } from "@/lib/return-to";
import { superadminEmail } from "@/lib/roles";
import { createSession, deleteSession } from "@/lib/session";

// Until email sending exists, this is the only code that passes.
const testCode = "123456";

// `next` is the page the person was on before signing in; onboarding passes it along.
export async function verifyCode(email: string, code: string, next?: string | null): Promise<{ error: string }> {
  const normalized = normalizeEmail(email);
  if (!emailPattern.test(normalized) || code !== testCode) {
    return { error: "კოდი არასწორია" };
  }

  // Signing in with SUPERADMIN_EMAIL is the only way to become the superadmin, and there is one.
  // Otherwise the no-op update makes `returning` give back the existing row too.
  const superadmin = normalized === superadminEmail();
  const [user] = await db
    .insert(users)
    .values({ email: normalized, role: superadmin ? "superadmin" : "user" })
    .onConflictDoUpdate({ target: users.email, set: superadmin ? { role: "superadmin" } : { email: normalized } })
    .returning();
  if (superadmin) {
    await db
      .update(users)
      .set({ role: "user" })
      .where(and(eq(users.role, "superadmin"), ne(users.id, user.id)));
  }

  await createSession(user.id);
  const back = safeNext(next);
  if (user.onboardedAt) redirect(back ?? "/");
  redirect(back ? `/onboarding?next=${encodeURIComponent(back)}` : "/onboarding");
}

// Called as a form action too, where the argument is FormData; only a string path counts.
export async function logout(next?: unknown) {
  await deleteSession();
  redirect(authUrl(safeNext(next)));
}

export async function logoutToLanding() {
  await deleteSession();
  redirect("/");
}

"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { emailPattern, normalizeEmail } from "@/lib/profile-rules";
import { authUrl, safeNext } from "@/lib/return-to";
import { createSession, deleteSession } from "@/lib/session";

// Until email sending exists, this is the only code that passes.
const testCode = "123456";

// `next` is the page the person was on before signing in; onboarding passes it along.
export async function verifyCode(email: string, code: string, next?: string | null): Promise<{ error: string }> {
  const normalized = normalizeEmail(email);
  if (!emailPattern.test(normalized) || code !== testCode) {
    return { error: "კოდი არასწორია" };
  }

  // The no-op update makes `returning` give back the existing row too.
  const [user] = await db
    .insert(users)
    .values({ email: normalized })
    .onConflictDoUpdate({ target: users.email, set: { email: normalized } })
    .returning();

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

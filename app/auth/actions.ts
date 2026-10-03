"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, deleteSession } from "@/lib/session";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Until email sending exists, this is the only code that passes.
const testCode = "123456";

export async function verifyCode(email: string, code: string): Promise<{ error: string }> {
  const normalized = email.trim().toLowerCase();
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
  redirect(user.onboardedAt ? "/" : "/onboarding");
}

export async function logout() {
  await deleteSession();
  redirect("/auth");
}

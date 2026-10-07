"use server";

import { redirect } from "next/navigation";
import { emailPattern, normalizeEmail } from "@/lib/profile-rules";
import { authUrl, safeNext } from "@/lib/return-to";
import { deleteSession } from "@/lib/session";
import { afterSignIn, signIn } from "@/lib/sign-in";

// Until email sending exists, this is the only code that passes.
const testCode = "123456";

// `next` is the page the person was on before signing in; onboarding passes it along.
export async function verifyCode(email: string, code: string, next?: string | null): Promise<{ error: string }> {
  const normalized = normalizeEmail(email);
  if (!emailPattern.test(normalized) || code !== testCode) {
    return { error: "კოდი არასწორია" };
  }

  const user = await signIn(normalized);
  if (user === "banned") return { error: "ეს ანგარიში დაბლოკილია" };
  redirect(afterSignIn(user, safeNext(next)));
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

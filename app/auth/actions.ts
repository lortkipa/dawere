"use server";

import { redirect } from "next/navigation";
import { isBanned } from "@/lib/bans";
import { clearPendingFacebook, readPendingFacebook } from "@/lib/facebook-pending";
import { emailPattern, normalizeEmail } from "@/lib/profile-rules";
import { authUrl, safeNext } from "@/lib/return-to";
import { deleteSession } from "@/lib/session";
import { afterSignIn, linkFacebook, signIn } from "@/lib/sign-in";
import { checkCode, issueCode } from "@/lib/sign-in-codes";

// Emails a sign-in code. A banned address gets none.
export async function sendCode(email: string): Promise<{ error?: string }> {
  const normalized = normalizeEmail(email);
  if (!emailPattern.test(normalized)) return { error: "შეიყვანე სწორი ელფოსტა" };
  if (await isBanned(normalized)) return { error: "ეს ანგარიში დაბლოკილია" };
  try {
    if (!(await issueCode(normalized))) return { error: "კოდი ახლახან გამოგიგზავნეთ. ცოტა ხანში სცადე თავიდან." };
  } catch (error) {
    console.error("Sending a sign-in code failed:", error);
    return { error: "კოდი ვერ გავაგზავნეთ. სცადე თავიდან." };
  }
  return {};
}

// `next` is the page the person was on before signing in; onboarding passes it along.
// `facebook` is set when the email was asked for because Facebook gave none (see
// app/auth/facebook/callback): the Facebook account gets linked to this user then.
export async function verifyCode(
  email: string,
  code: string,
  next?: string | null,
  facebook?: boolean,
): Promise<{ error: string }> {
  const normalized = normalizeEmail(email);
  if (!emailPattern.test(normalized) || !/^\d{6}$/.test(code)) return { error: "კოდი არასწორია" };
  const checked = await checkCode(normalized, code);
  if (checked === "wrong") return { error: "კოდი არასწორია" };
  if (checked === "expired") return { error: "კოდს ვადა გაუვიდა. მოითხოვე ახალი." };

  const pending = facebook ? await readPendingFacebook() : null;
  const user = await signIn(normalized, pending ?? {});
  if (user === "banned") return { error: "ეს ანგარიში დაბლოკილია" };
  if (pending) {
    await linkFacebook(user.id, pending.facebookId);
    await clearPendingFacebook();
  }
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

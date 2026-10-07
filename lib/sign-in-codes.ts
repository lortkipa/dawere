import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { signInCodes } from "./db/schema";
import { codeEmailSubject, codeEmailText, codeLifetimeMinutes, defaultCodeEmailFooter } from "./code-email";
import { sendMail } from "./mail";
import { getSiteText } from "./site-texts";

// The same wait as resendCooldown in components/auth-form.tsx.
export const resendCooldown = 60;
const maxAttempts = 5;

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

// Makes a new code for the address, replacing any earlier one, and emails it. `email` must already
// be normalized. False when the last code went out less than `resendCooldown` seconds ago.
export async function issueCode(email: string): Promise<boolean> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const fresh = {
    codeHash: hash(code),
    attempts: 0,
    sentAt: sql`now()`,
    expiresAt: sql`now() + make_interval(mins => ${codeLifetimeMinutes})`,
  };
  // The cooldown check is part of the upsert, so two quick requests can't both send.
  const [row] = await db
    .insert(signInCodes)
    .values({ email, ...fresh })
    .onConflictDoUpdate({
      target: signInCodes.email,
      set: fresh,
      setWhere: lt(signInCodes.sentAt, sql`now() - make_interval(secs => ${resendCooldown})`),
    })
    .returning({ email: signInCodes.email });
  if (!row) return false;

  const footer = (await getSiteText("code-email-footer"))?.value ?? defaultCodeEmailFooter;
  try {
    await sendMail({ to: email, subject: codeEmailSubject(code), text: codeEmailText(code, footer) });
  } catch (error) {
    // Free the cooldown, so the reader can try again right away.
    await db.delete(signInCodes).where(eq(signInCodes.email, email));
    throw error;
  }
  return true;
}

// "ok" means the reader may sign in; the code is gone after that. A wrong guess counts towards
// `maxAttempts`, after which the code stops working, as it does once it expires.
export async function checkCode(email: string, code: string): Promise<"ok" | "wrong" | "expired"> {
  // Counting the guess before comparing keeps parallel guesses within the limit.
  const [row] = await db
    .update(signInCodes)
    .set({ attempts: sql`${signInCodes.attempts} + 1` })
    .where(
      and(
        eq(signInCodes.email, email),
        gt(signInCodes.expiresAt, sql`now()`),
        lt(signInCodes.attempts, maxAttempts),
      ),
    )
    .returning({ codeHash: signInCodes.codeHash });
  if (!row) return "expired";

  if (!timingSafeEqual(Buffer.from(hash(code)), Buffer.from(row.codeHash))) return "wrong";
  await db.delete(signInCodes).where(eq(signInCodes.email, email));
  return "ok";
}

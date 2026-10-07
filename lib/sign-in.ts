import "server-only";
import { and, eq, getTableColumns, isNull, ne, sql } from "drizzle-orm";
import { isBanned } from "./bans";
import { db } from "./db";
import { users, type User } from "./db/schema";
import { maxNameLength } from "./onboarding-options";
import { maxAvatarBytes } from "./profile-rules";
import { superadminEmail } from "./roles";
import { createSession } from "./session";
import { deleteAvatar, saveAvatar } from "./uploads";

// What a Google account brings along. Used only when the Google sign-in makes the account; an
// account that already exists keeps its own name and photo, or the lack of them.
type Extras = { name?: string; picture?: string };

// Signs in by email, making the account on first sign-in. `email` must already be normalized.
export async function signIn(email: string, extras: Extras = {}): Promise<User | "banned"> {
  if (await isBanned(email)) return "banned";

  const name = extras.name?.trim().slice(0, maxNameLength) || null;

  // Signing in with SUPERADMIN_EMAIL is the only way to become the superadmin, and there is one.
  // Otherwise the no-op update makes `returning` give back the existing row too. `xmax = 0`
  // holds only for a row this statement inserted, i.e. a new account.
  const superadmin = email === superadminEmail();
  const [{ created, ...user }] = await db
    .insert(users)
    .values({ email, name, role: superadmin ? "superadmin" : "user" })
    .onConflictDoUpdate({ target: users.email, set: superadmin ? { role: "superadmin" } : { email } })
    .returning({ ...getTableColumns(users), created: sql<boolean>`xmax = 0` });
  if (superadmin) {
    await db
      .update(users)
      .set({ role: "user" })
      .where(and(eq(users.role, "superadmin"), ne(users.id, user.id)));
  }

  if (created && extras.picture) {
    const avatar = await savePicture(extras.picture);
    if (avatar) {
      const [updated] = await db
        .update(users)
        .set({ avatar })
        .where(and(eq(users.id, user.id), isNull(users.avatar)))
        .returning({ id: users.id });
      if (updated) user.avatar = avatar;
      else await deleteAvatar(avatar);
    }
  }

  await createSession(user.id);
  return user;
}

// Where to go once signed in: onboarding first if it isn't finished, carrying `next` along.
export function afterSignIn(user: User, next: string | null) {
  if (user.onboardedAt) return next ?? "/";
  return next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding";
}

// Google's profile photo as our own avatar file, or null when anything goes wrong; sign-in
// goes on without a photo then.
async function savePicture(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".googleusercontent.com")) return null;
    // The URL ends in a size like "=s96-c"; ask for one as big as our avatars.
    parsed.pathname = parsed.pathname.replace(/=s\d+(-c)?$/, "=s400-c");

    const response = await fetch(parsed, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxAvatarBytes) return null;
    return await saveAvatar(bytes);
  } catch {
    return null;
  }
}

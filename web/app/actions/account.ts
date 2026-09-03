"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentAccount } from "@/lib/account";
import { checkName, handleFor } from "@/lib/handle";

/**
 * Both actions here re-read the session and scope their write by the id they
 * find. A Server Action is a POST endpoint anyone can call directly, so the fact
 * that the only UI reaching it is /settings proves nothing.
 */

const MAX_BIO = 240;

/** What the profile form reports back, in the dialog it opens either way. */
export type ProfileState = {
  saved: boolean;
  error: string | null;
  /** Whether the save also moved the author's page, which a rename does. */
  moved?: boolean;
};

export async function updateProfile(
  _previous: ProfileState,
  form: FormData,
): Promise<ProfileState> {
  const account = await currentAccount();
  if (!account) return failed("ჯერ უნდა შეხვიდე.");

  const name = checkName(text(form.get("name")));
  if (!name.ok) return failed(name.error);

  const bio = text(form.get("bio"));
  if (bio.length > MAX_BIO) {
    return failed(`ტექსტი ${MAX_BIO} სიმბოლოზე გრძელია.`);
  }

  // The address is not a field: both halves of it are derived, so renaming is
  // what moves the page, and nothing else can.
  const handle = handleFor(name.name, account.id);
  const moved = handle !== account.handle;

  try {
    await db
      .update(users)
      .set({ name: name.name, handle, bio })
      .where(eq(users.id, account.id));
  } catch (error) {
    // Two people would have to share a first name *and* the head of their row
    // id to land here. The index is the backstop; everything else is a real
    // failure and belongs in the log rather than in a dialog.
    if (!isTaken(error)) throw error;
    return failed("ამ სახელით მისამართი დაკავებულია. სცადე სხვა სახელი.");
  }

  revalidatePath("/settings");
  // Both addresses: the one the page has just moved to, and the one it left —
  // which now belongs to nobody and must stop answering with this profile.
  revalidatePath(`/${handle}`);
  if (moved) revalidatePath(`/${account.handle}`);

  return { saved: true, error: null, moved };
}

/**
 * The end of the account. `users` is the root of every cascade — the OAuth rows
 * and every article go with it — so this one delete is the whole deletion.
 *
 * There is no confirmation to check here: the dialog that asks is the author's
 * own protection against a misclick, not a guard against whoever already holds
 * their session cookie.
 */
export async function deleteAccount(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await db.delete(users).where(eq(users.id, session.user.id));

  // A session here is a signed cookie rather than a row, so deleting the account
  // does not end it. Signing out does, and it carries the redirect home.
  await signOut({ redirectTo: "/" });
}

/** One field of a form, as a single trimmed line. */
function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function failed(error: string): ProfileState {
  return { saved: false, error };
}

/** Postgres's unique_violation, wrapped or bare depending on the driver path. */
function isTaken(error: unknown): boolean {
  const own = (error as { code?: string })?.code;
  const cause = (error as { cause?: { code?: string } })?.cause?.code;

  return own === "23505" || cause === "23505";
}

"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  // Not the author's own page, though that is where this ends: the handle is
  // read from the row, and the row does not exist yet the first time through.
  // `/` sends a signed-in person on to it.
  await signIn("google", { redirectTo: "/" });
}

// Facebook goes here later. Because both providers link on email, the second one
// needs nothing beyond a provider entry in auth.ts and its own action.

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

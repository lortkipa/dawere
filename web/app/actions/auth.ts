"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  // `/` rather than `/feed`: the row does not exist yet the first time through,
  // and the landing page is what sends a signed-in person on to their feed.
  await signIn("google", { redirectTo: "/" });
}

// Facebook goes here later. Because both providers link on email, the second one
// needs nothing beyond a provider entry in auth.ts and its own action.

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

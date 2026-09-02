"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

// Facebook goes here later. Because both providers link on email, the second one
// needs nothing beyond a provider entry in auth.ts and its own action.

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

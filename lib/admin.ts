import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { isAdmin, isSuperadmin } from "./roles";
import { getCurrentUser } from "./session";

// /admin and its actions answer like a missing page to everyone else.
export const requireAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
});

export async function requireSuperadmin() {
  const user = await requireAdmin();
  if (!isSuperadmin(user)) notFound();
  return user;
}

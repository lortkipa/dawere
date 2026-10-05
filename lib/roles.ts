import type { Role, User } from "./db/schema";
import { normalizeEmail } from "./profile-rules";

type Account = Pick<User, "role" | "email">;

export const roleLabels: Record<Role, string> = {
  user: "მომხმარებელი",
  admin: "ადმინი",
  superadmin: "სუპერადმინი",
};

// Server only: the variable isn't sent to the browser.
export function superadminEmail() {
  return normalizeEmail(process.env.SUPERADMIN_EMAIL ?? "") || null;
}

// The role alone isn't enough: changing SUPERADMIN_EMAIL takes the seat away at once.
export function isSuperadmin(user: Account) {
  return user.role === "superadmin" && user.email === superadminEmail();
}

export function isAdmin(user: Account) {
  return user.role === "admin" || isSuperadmin(user);
}

// Whether `actor` may edit `target`'s account, posts and comments from /admin. Admins only
// reach plain users; the superadmin reaches everyone, itself included.
export function canManage(actor: Account, target: Account) {
  if (isSuperadmin(actor)) return true;
  return isAdmin(actor) && target.role === "user";
}

// The superadmin's own account can be edited but not deleted or demoted from the panel.
export function canRemove(actor: Account, target: Account) {
  return canManage(actor, target) && !isSuperadmin(target);
}

export function canSetRole(actor: Account, target: Account) {
  return isSuperadmin(actor) && !isSuperadmin(target);
}

"use server";

import { and, eq, ne, or } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { deleteUserAndFiles } from "@/lib/accounts";
import { maxBanReason } from "@/lib/ban-rules";
import { ban, isBanned, unban } from "@/lib/bans";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { sessions, users, type Role, type User } from "@/lib/db/schema";
import { uuidPattern } from "@/lib/ids";
import { getCategories, isCategory } from "@/lib/categories";
import { maxNameLength, minTopics } from "@/lib/onboarding-options";
import {
  emailPattern,
  handleTakenError,
  isValidHandle,
  maxAvatarBytes,
  maxBioLength,
  normalizeEmail,
  normalizeHandle,
} from "@/lib/profile-rules";
import { canManage, canRemove, canSetRole, isSuperadmin, superadminEmail } from "@/lib/roles";
import { deleteAvatar, saveAvatar } from "@/lib/uploads";

type Result = { error: string } | void;

const genericError = "რაღაც შეცდომაა, სცადე თავიდან";
const forbiddenError = "ამის უფლება არ გაქვს";
const emailTakenError = "ეს ელფოსტა უკვე გამოყენებულია";
const bannedEmailError = "ეს ელფოსტა დაბლოკილია";

// The signed-in admin and the user they act on, or an error when they may not.
async function managed(id: string): Promise<{ actor: User; target: User } | { error: string }> {
  const actor = await requireAdmin();
  if (!uuidPattern.test(id)) return { error: genericError };
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { error: "ეს მომხმარებელი აღარ არსებობს" };
  if (!canManage(actor, target)) return { error: forbiddenError };
  return { actor, target };
}

// The superadmin's address comes from SUPERADMIN_EMAIL and is only taken by signing in with it.
async function checkEmail(email: string): Promise<Result> {
  if (!emailPattern.test(email)) return { error: "ელფოსტა არასწორია" };
  if (email === superadminEmail()) return { error: emailTakenError };
  if (await isBanned(email)) return { error: bannedEmailError };
}

async function validTopics(slugs: string[]) {
  const chosen = [...new Set(slugs)];
  const categories = await getCategories();
  return chosen.length >= minTopics && chosen.every((slug) => isCategory(categories, slug)) ? chosen : null;
}

// The first step of adding a user, so a taken address or handle shows before picking topics.
export async function checkNewUser(emailValue: string, handleValue: string): Promise<Result> {
  await requireAdmin();
  const email = normalizeEmail(emailValue);
  const handle = normalizeHandle(handleValue);
  const emailError = await checkEmail(email);
  if (emailError) return emailError;
  if (handle && !isValidHandle(handle)) return { error: genericError };

  const taken = await db
    .select({ email: users.email, handle: users.handle })
    .from(users)
    .where(handle ? or(eq(users.email, email), eq(users.handle, handle)) : eq(users.email, email));
  if (taken.some((user) => user.email === email)) return { error: emailTakenError };
  if (taken.length > 0) return { error: handleTakenError };
}

// What onboarding asks for, so the account is ready to use; the referral stays empty. Without a
// handle the database picks a random one, as for everyone.
export async function createUser(input: {
  email: string;
  name: string;
  handle: string;
  topics: string[];
  role: Role;
}): Promise<{ error: string } | { id: string }> {
  const actor = await requireAdmin();
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const handle = normalizeHandle(input.handle);
  const chosen = await validTopics(input.topics);
  const emailError = await checkEmail(email);
  if (emailError) return emailError;
  if (!name || name.length > maxNameLength || (handle && !isValidHandle(handle)) || !chosen) {
    return { error: genericError };
  }
  if (input.role !== "user" && (input.role !== "admin" || !isSuperadmin(actor))) return { error: forbiddenError };

  try {
    const [user] = await db
      .insert(users)
      .values({ email, name, topics: chosen, onboardedAt: new Date(), role: input.role, ...(handle && { handle }) })
      .returning({ id: users.id });
    return { id: user.id };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    return { error: taken ? emailTakenError : handleTakenError };
  }
}

export async function updateUserEmail(id: string, value: string): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  // Changing it would hand the seat to nobody; SUPERADMIN_EMAIL decides.
  if (isSuperadmin(access.target)) return { error: forbiddenError };
  // The ban is on the address, so changing it would lift the ban.
  if (await isBanned(access.target.email)) return { error: "დაბლოკილი მომხმარებლის ელფოსტა არ იცვლება" };
  const email = normalizeEmail(value);
  if (email === access.target.email) return;
  const emailError = await checkEmail(email);
  if (emailError) return emailError;

  try {
    await db.update(users).set({ email }).where(eq(users.id, id));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: emailTakenError };
    throw error;
  }
  refresh();
}

export async function checkUserHandle(id: string, value: string): Promise<boolean> {
  await requireAdmin();
  const handle = normalizeHandle(value);
  if (!uuidPattern.test(id) || !isValidHandle(handle)) return false;
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.handle, handle), ne(users.id, id)))
    .limit(1);
  return !taken;
}

export async function updateUserHandle(id: string, value: string): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  const handle = normalizeHandle(value);
  if (!isValidHandle(handle)) return { error: genericError };
  if (handle === access.target.handle) return;

  try {
    await db.update(users).set({ handle }).where(eq(users.id, id));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: handleTakenError };
    throw error;
  }
  refresh();
}

export async function updateUserName(id: string, value: string): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  const name = value.trim();
  if (name.length === 0 || name.length > maxNameLength) return { error: genericError };

  await db.update(users).set({ name }).where(eq(users.id, id));
  refresh();
}

export async function updateUserBio(id: string, value: string): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  const bio = value.trim();
  if (bio.length > maxBioLength) return { error: genericError };

  await db
    .update(users)
    .set({ bio: bio || null })
    .where(eq(users.id, id));
  refresh();
}

export async function updateUserFavoritesPublic(id: string, value: boolean): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  if (typeof value !== "boolean") return { error: genericError };

  await db.update(users).set({ favoritesPublic: value }).where(eq(users.id, id));
  refresh();
}

// Counts as a choice by hand: automatic removals wait, as after the reader's own edit.
export async function updateUserTopics(id: string, slugs: string[]): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  const chosen = await validTopics(slugs);
  if (!chosen) return { error: genericError };

  await db
    .update(users)
    .set({
      topics: chosen,
      dismissedTopics: access.target.dismissedTopics.filter((slug) => !chosen.includes(slug)),
      topicsEditedAt: new Date(),
    })
    .where(eq(users.id, id));
  refresh();
}

export async function updateUserAvatar(id: string, formData: FormData): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: genericError };
  if (file.size > maxAvatarBytes) return { error: "ფოტო 5 მბ-ზე დიდი არ უნდა იყოს" };

  let avatar: string;
  try {
    avatar = await saveAvatar(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { error: "ამ ფაილს ვერ ვკითხულობთ, სცადე სხვა ფოტო" };
  }

  await db.update(users).set({ avatar }).where(eq(users.id, id));
  await deleteAvatar(access.target.avatar);
  refresh();
}

export async function removeUserAvatar(id: string): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;

  await db.update(users).set({ avatar: null }).where(eq(users.id, id));
  await deleteAvatar(access.target.avatar);
  refresh();
}

export async function setUserRole(id: string, role: Role): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  if (!canSetRole(access.actor, access.target) || (role !== "user" && role !== "admin")) {
    return { error: forbiddenError };
  }

  await db.update(users).set({ role }).where(eq(users.id, id));
  refresh();
}

export async function signOutUser(id: string): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;

  await db.delete(sessions).where(eq(sessions.userId, id));
  refresh();
}

export async function deleteUser(id: string): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  if (!canRemove(access.actor, access.target)) return { error: forbiddenError };

  await deleteUserAndFiles(access.target);
  redirect("/admin/users");
}

// Signs the user out, blocks their email and hides them from readers; see lib/bans.ts.
export async function banUser(id: string, reasonValue: string): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  if (!canRemove(access.actor, access.target)) return { error: forbiddenError };
  const reason = reasonValue.trim();
  if (reason.length > maxBanReason) return { error: genericError };

  await ban(access.target.email, reason, access.actor.id);
  refresh();
}

export async function unbanUser(id: string): Promise<Result> {
  const access = await managed(id);
  if ("error" in access) return access;
  if (!canRemove(access.actor, access.target)) return { error: forbiddenError };

  await unban(access.target.email);
  refresh();
}

// The account behind an address, if any, must be one this admin could ban from its own page.
async function canBanEmail(actor: User, email: string) {
  const [account] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return !account || canRemove(actor, account);
}

// For an address with no account yet, or one whose account was deleted.
export async function banEmail(emailValue: string, reasonValue: string): Promise<Result> {
  const actor = await requireAdmin();
  const email = normalizeEmail(emailValue);
  const reason = reasonValue.trim();
  if (!emailPattern.test(email)) return { error: "ელფოსტა არასწორია" };
  if (reason.length > maxBanReason) return { error: genericError };
  if (email === superadminEmail() || !(await canBanEmail(actor, email))) return { error: forbiddenError };
  if (await isBanned(email)) return { error: "ეს ელფოსტა უკვე დაბლოკილია" };

  await ban(email, reason, actor.id);
  refresh();
}

export async function unbanEmail(emailValue: string): Promise<Result> {
  const actor = await requireAdmin();
  const email = normalizeEmail(emailValue);
  if (!(await canBanEmail(actor, email))) return { error: forbiddenError };

  await unban(email);
  refresh();
}

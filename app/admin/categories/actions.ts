"use server";

import { asc, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  categoryLabelPattern,
  categorySlugPattern,
  maxCategoryEmojiLength,
  maxCategoryLabelLength,
} from "@/lib/category-rules";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db/errors";
import { categories } from "@/lib/db/schema";
import { minTopics } from "@/lib/onboarding-options";
import { maxTagLength } from "@/lib/tags";

type Result = { error: string } | void;

const genericError = "რაღაც შეცდომაა, სცადე თავიდან";
const labelTakenError = "ასეთი კატეგორია უკვე არსებობს";

function cleanLabel(value: string) {
  const label = value.trim().replace(/\s+/g, " ");
  return label.length > 0 && label.length <= maxCategoryLabelLength && categoryLabelPattern.test(label) ? label : null;
}

function cleanEmoji(value: string) {
  const emoji = value.trim();
  return emoji.length > 0 && emoji.length <= maxCategoryEmojiLength && !/\s/.test(emoji) ? emoji : null;
}

// Another category already reads the same, which would make the tag ambiguous.
async function labelTaken(label: string, except?: string) {
  const rows = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(sql`lower(${categories.label}) = lower(${label})`);
  return rows.some((row) => row.slug !== except);
}

// Replaces one tag with another in every post that has it, keeping the order and no duplicates.
// With `to` null the tag is only removed.
function replaceTag(from: string, to: string | null) {
  const replaced = to === null ? sql`array_remove(tags, ${from})` : sql`array_replace(tags, ${from}, ${to})`;
  return sql`
    update posts set tags = coalesce(
      (select array_agg(t order by o) from (
        select t, min(o) as o from unnest(${replaced}) with ordinality as u(t, o) group by t
      ) x),
      '{}'
    )
    where ${from} = any(tags)
  `;
}

// Authors who typed the label as their own tag now have the category instead.
function adoptTyped(label: string, slug: string) {
  const typed = label.toLowerCase();
  return typed === slug ? null : replaceTag(typed, slug);
}

export async function createCategory(input: { slug: string; label: string; emoji: string }): Promise<Result> {
  await requireAdmin();
  const slug = input.slug.trim().toLowerCase();
  const label = cleanLabel(input.label);
  const emoji = cleanEmoji(input.emoji);
  if (!categorySlugPattern.test(slug) || !label || !emoji) return { error: genericError };
  if (await labelTaken(label)) return { error: labelTakenError };

  try {
    await db.transaction(async (tx) => {
      await tx.insert(categories).values({
        slug,
        label,
        emoji,
        position: sql`coalesce((select max(position) + 1 from categories), 0)`,
      });
      const adopt = adoptTyped(label, slug);
      if (adopt) await tx.execute(adopt);
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "ეს slug უკვე გამოყენებულია" };
    throw error;
  }
  refresh();
}

// The slug stays: readers and posts store it.
export async function updateCategory(slug: string, input: { label: string; emoji: string }): Promise<Result> {
  await requireAdmin();
  const label = cleanLabel(input.label);
  const emoji = cleanEmoji(input.emoji);
  if (!label || !emoji) return { error: genericError };
  if (await labelTaken(label, slug)) return { error: labelTakenError };

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(categories)
      .set({ label, emoji })
      .where(eq(categories.slug, slug))
      .returning({ slug: categories.slug });
    if (updated.length === 0) return;
    const adopt = adoptTyped(label, slug);
    if (adopt) await tx.execute(adopt);
  });
  refresh();
}

export async function moveCategory(slug: string, direction: "up" | "down"): Promise<Result> {
  await requireAdmin();
  await db.transaction(async (tx) => {
    const list = await tx
      .select({ slug: categories.slug })
      .from(categories)
      .orderBy(asc(categories.position), asc(categories.slug));
    const from = list.findIndex((row) => row.slug === slug);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    // Renumbered from 0, so positions stay a clean sequence.
    for (const [position, row] of list.entries()) {
      await tx.update(categories).set({ position }).where(eq(categories.slug, row.slug));
    }
  });
  refresh();
}

// Readers lose the topic; posts keep it as a plain tag spelled like the label, so their tags
// still say what they are about.
export async function deleteCategory(slug: string): Promise<Result> {
  await requireAdmin();
  const result = await db.transaction(async (tx): Promise<Result> => {
    const [row] = await tx.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (!row) return;
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(categories);
    if (total <= minTopics) return { error: `კატეგორია ${minTopics}-ზე ნაკლები არ უნდა დარჩეს` };

    await tx.execute(sql`
      update users set
        topics = array_remove(topics, ${slug}),
        dismissed_topics = array_remove(dismissed_topics, ${slug})
      where ${slug} = any(topics) or ${slug} = any(dismissed_topics)
    `);
    const typed = row.label.toLowerCase();
    await tx.execute(replaceTag(slug, typed.length <= maxTagLength ? typed : null));
    await tx.delete(categories).where(eq(categories.slug, slug));
  });
  if (result) return result;
  refresh();
}

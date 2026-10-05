import "server-only";
import { asc } from "drizzle-orm";
import { cache } from "react";
import { db } from "./db";
import { categories } from "./db/schema";
import type { Option } from "./onboarding-options";

// The topics, in the order admins set. Read once per request.
export const getCategories = cache(async (): Promise<Option[]> => {
  return db
    .select({ slug: categories.slug, emoji: categories.emoji, label: categories.label })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.slug));
});

export function isCategory(list: Option[], slug: string) {
  return list.some((category) => category.slug === slug);
}

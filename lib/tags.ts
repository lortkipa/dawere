import type { Option } from "./onboarding-options";

// A post's tags, shared by the editor and the publish action. Categories are stored by slug, so
// they match the topics readers picked; anything else is stored as typed, normalized. A post may
// have none.

export const maxTags = 5;
export const maxTagLength = 30;

const allowed = /^[\p{L}\p{N}][\p{L}\p{N} -]*$/u;

// The stored form of what the author typed, or null if it can't be a tag. „პროგრამირება“,
// „Programming“ and „#programming“ all become `programming`.
export function normalizeTag(input: string, categories: Option[]) {
  const tag = input.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!tag || tag.length > maxTagLength || !allowed.test(tag)) return null;
  const category = categories.find((option) => option.slug === tag || option.label.toLowerCase() === tag);
  return category ? category.slug : tag;
}

export function tagView(tag: string, categories: Option[]): { emoji?: string; label: string } {
  const category = categories.find((option) => option.slug === tag);
  return category ? { emoji: category.emoji, label: category.label } : { label: tag };
}

import { topics } from "./onboarding-options";

// A post's tags, shared by the editor and the publish action. Onboarding topics are stored by
// slug, so they match the topics readers picked; anything else is stored as typed, normalized.

export const minTags = 1;
export const maxTags = 5;
export const maxTagLength = 30;

const allowed = /^[\p{L}\p{N}][\p{L}\p{N} -]*$/u;

// The stored form of what the author typed, or null if it can't be a tag. „პროგრამირება“,
// „Programming“ and „#programming“ all become `programming`.
export function normalizeTag(input: string) {
  const tag = input.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!tag || tag.length > maxTagLength || !allowed.test(tag)) return null;
  const topic = topics.find((option) => option.slug === tag || option.label.toLowerCase() === tag);
  return topic ? topic.slug : tag;
}

export function tagView(tag: string): { emoji?: string; label: string } {
  const topic = topics.find((option) => option.slug === tag);
  return topic ? { emoji: topic.emoji, label: topic.label } : { label: tag };
}

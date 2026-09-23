/**
 * "@username" in a comment. Usernames are 3–30 of [a-z0-9_] (see
 * usernameSchema); the lookbehind keeps an email address such as
 * "me@site.ge" from mentioning @site.
 */
const MENTION = /(?<![\w@])@([a-z0-9_]{3,30})(?![a-z0-9_])/gi;

/** Distinct usernames mentioned in `text`, lower-cased, in order of appearance. */
export function extractMentions(text: string, max = 10): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION)) {
    found.add(match[1].toLowerCase());
    if (found.size >= max) break;
  }
  return [...found];
}

export type TextPart = { text: string; mention?: string };

/** Splits `text` into plain runs and mentions, for rendering the mentions as links. */
export function splitMentions(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION)) {
    const start = match.index;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: match[0], mention: match[1].toLowerCase() });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

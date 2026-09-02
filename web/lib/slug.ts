/**
 * The national (2002) romanisation of mkhedruli, minus its apostrophes — those
 * are the only thing separating კ from ქ or წ from ც, so a handful of letters
 * collapse onto the same latin string here. That is fine: the random suffix
 * `slugFromTitle` appends is what actually keeps slugs apart.
 */
const ROMAN: Record<string, string> = {
  ა: "a", ბ: "b", გ: "g", დ: "d", ე: "e", ვ: "v", ზ: "z", თ: "t",
  ი: "i", კ: "k", ლ: "l", მ: "m", ნ: "n", ო: "o", პ: "p", ჟ: "zh",
  რ: "r", ს: "s", ტ: "t", უ: "u", ფ: "p", ქ: "k", ღ: "gh", ყ: "q",
  შ: "sh", ჩ: "ch", ც: "ts", ძ: "dz", წ: "ts", ჭ: "ch", ხ: "kh", ჯ: "j",
  ჰ: "h", ჱ: "e", ჲ: "y", ჳ: "w", ჴ: "kh", ჵ: "o", ჶ: "f",
};

/** Longest slug body before the suffix — long enough to stay readable. */
const MAX_BODY = 60;

/**
 * A URL-safe slug for a Georgian (or latin) title, plus a short random suffix.
 *
 * The suffix is what makes the slug unique, so publishing never has to query
 * for a free name or retry on a clash: two identical titles differ in 32 bits
 * of randomness. The unique index on `articles.slug` is the backstop.
 */
export function slugFromTitle(title: string): string {
  const body = Array.from(title.toLowerCase())
    .map((letter) => ROMAN[letter] ?? letter)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_BODY)
    .replace(/^-+|-+$/g, "");

  // 8 hex characters, taken from the same source as our row ids.
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

  // A title written entirely in a script we do not romanise leaves nothing to
  // prefix with, and the suffix stands alone as the slug.
  return body ? `${body}-${suffix}` : suffix;
}

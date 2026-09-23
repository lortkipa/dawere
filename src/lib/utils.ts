import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Georgian → Latin, the national transliteration system. Slugs stay ASCII and
 * readable; without this every Georgian title would collapse to "untitled".
 */
const GEORGIAN_LATIN: Record<string, string> = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k',
  ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u',
  ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts',
  ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
};

export function transliterate(input: string): string {
  let out = '';
  for (const char of input) out += GEORGIAN_LATIN[char] ?? char;
  return out;
}

/** URL-safe slug. Falls back to a random suffix when the input has no usable characters. */
export function slugify(input: string, maxLength = 60): string {
  const base = transliterate(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, maxLength)
    .replace(/^-|-$/g, '');
  return base || 'teksti';
}

export function randomSuffix(length = 6): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length);
}

/**
 * Relative time, spelled out here rather than through Intl.RelativeTimeFormat.
 *
 * Chrome resolves the 'ka' locale to English for relative time while Node
 * renders Georgian, so the shared formatter produced "26 minutes ago" on the
 * client against "26 წუთის წინ" from the server — a hydration mismatch on every
 * comment thread. Writing the six forms out keeps both sides identical.
 */
const RELATIVE_UNITS: [string, number][] = [
  ['წლის', 31_536_000_000],
  ['თვის', 2_592_000_000],
  ['კვირის', 604_800_000],
  ['დღის', 86_400_000],
  ['საათის', 3_600_000],
  ['წუთის', 60_000],
];

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return '';
  const value = typeof date === 'string' ? new Date(date) : date;
  const elapsed = Date.now() - value.getTime();

  // A clock skew of a few seconds should read as "just now", not "in a minute".
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) {
      const count = Math.floor(Math.abs(elapsed) / ms);
      return elapsed >= 0 ? `${count} ${unit} წინ` : `${count} ${unit} შემდეგ`;
    }
  }
  return 'ახლახან';
}

/** Abbreviated Georgian months, matching what Intl produces for 'ka'. */
const MONTHS_SHORT = [
  'იან',
  'თებ',
  'მარ',
  'აპრ',
  'მაი',
  'ივნ',
  'ივლ',
  'აგვ',
  'სექ',
  'ოქტ',
  'ნოე',
  'დეკ',
];

/** "30 აგვ. 2026" — spelled out for the same reason as timeAgo. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const value = typeof date === 'string' ? new Date(date) : date;
  return `${value.getDate()} ${MONTHS_SHORT[value.getMonth()]}. ${value.getFullYear()}`;
}

/** The same, without the year: axis labels and tooltips. */
export function formatDayShort(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return `${value.getDate()} ${MONTHS_SHORT[value.getMonth()]}`;
}

/**
 * Compact counts, also hand-rolled: Intl's compact notation disagrees between
 * Node and the browser for 'ka' ("1,5 ათ." against "1.5K"), and these numbers
 * are rendered inside client components such as the like button.
 */
export function formatCount(n: number): string {
  if (Math.abs(n) < 1000) return String(n);

  const round = (value: number) => Math.round(value * 10) / 10;
  // Rounded first, so 999_999 reads as "1 მლნ." rather than "1000 ათ.".
  const thousands = round(n / 1000);
  const [value, suffix] =
    Math.abs(thousands) < 1000 ? [thousands, 'ათ.'] : [round(n / 1_000_000), 'მლნ.'];

  return `${String(value).replace('.', ',')} ${suffix}`;
}

/** Deterministic hue (0–359) for a seed: avatar fallbacks, profile banners, topic art. */
export function seedHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return hash;
}

/** Deterministic pastel-ish background for avatar fallbacks. */
export function avatarColor(seed: string): string {
  return `hsl(${seedHue(seed)} 55% 45%)`;
}

/**
 * toUpperCase() maps Mkhedruli to Mtavruli (U+1C90…), which is exactly the
 * right form for standalone initials — Noto Sans Georgian carries those glyphs.
 * Spread rather than index: it keeps the intent legible for non-ASCII names.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return [...parts[0]].slice(0, 2).join('').toUpperCase();
  return ([...parts[0]][0] + [...parts[parts.length - 1]][0]).toUpperCase();
}

/**
 * Characters, not words. A Georgian word averages ~8 characters against
 * English's ~5, so counting words would quietly rate Georgian prose as a third
 * faster to read than the same text in English. Roughly 1100 characters a
 * minute matches an unhurried Georgian reader.
 */
const CHARS_PER_MINUTE = 1100;

export function readingMinutes(text: string): number {
  return minutesForLength(text.trim().replace(/\s+/g, ' ').length);
}

/** The same estimate from a character count, for the editor's live footer. */
export function minutesForLength(chars: number): number {
  return Math.max(1, Math.round(chars / CHARS_PER_MINUTE));
}

export function excerpt(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids arrive from URLs and client calls. Postgres rejects a malformed uuid with
 * an exception rather than "no rows", so check the shape before querying.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/**
 * A post-login destination taken from `?next=`. Only same-site paths pass:
 * "//evil.example" and "/\evil.example" are protocol-relative to a browser.
 */
export function safeNext(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

/** A page number from `?page=`, clamped so a hand-typed 10^9 cannot ask for a huge offset. */
export function pageParam(value: unknown, max = 500): number {
  const n = Math.floor(Number(typeof value === 'string' ? value : 1));
  return Number.isFinite(n) ? Math.min(Math.max(1, n), max) : 1;
}

/** "სექ. 2026" — month and year, for "joined" lines. */
export function formatMonthYear(date: Date | string | null | undefined): string {
  if (!date) return '';
  const value = typeof date === 'string' ? new Date(date) : date;
  return `${MONTHS_SHORT[value.getMonth()]}. ${value.getFullYear()}`;
}

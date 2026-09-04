/**
 * One formatter, built once. Every date a reader sees is a publication date, so
 * the day/month/year form is the only one the platform needs.
 */
const georgian = new Intl.DateTimeFormat("ka-GE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(date: Date): string {
  return georgian.format(date);
}

/**
 * One relative formatter, built once beside the absolute one. Georgian gets its
 * own words for the near past — „ახლა“, „გუშინ“ — and Intl already knows them.
 */
const since = new Intl.RelativeTimeFormat("ka-GE", { numeric: "auto" });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * How long ago something was said, rather than the day it was said on. A
 * conversation is read as one, and a page of comments all stamped with today's
 * date says nothing about the order they arrived in.
 *
 * Only for the first week. After that the distance stops meaning anything and
 * the date is the more useful of the two — which is also where a comment stops
 * being part of a conversation and starts being part of a record.
 *
 * Rendered on the server, so it is right when the page is built and drifts
 * until the next one. Every reader is handed the article the same way, so it is
 * as fresh as everything else around it.
 */
export function formatSince(date: Date, now: Date = new Date()): string {
  const elapsed = now.getTime() - date.getTime();

  // Beyond a week, and anything claiming to be from the future — a clock that
  // disagrees with ours should not produce „-3 წუთის წინ“.
  if (elapsed >= WEEK || elapsed < 0) return formatDate(date);

  if (elapsed < MINUTE) return since.format(0, "second");
  if (elapsed < HOUR) {
    return since.format(-Math.floor(elapsed / MINUTE), "minute");
  }
  if (elapsed < DAY) return since.format(-Math.floor(elapsed / HOUR), "hour");

  return since.format(-Math.floor(elapsed / DAY), "day");
}

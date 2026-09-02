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

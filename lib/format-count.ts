// Exact up to 9999 so a like visibly adds one, then compact („12K“). No toLocaleString:
// server and browser ICU disagree on the separator, which breaks hydration.
export function formatCount(value: number) {
  if (value < 10_000) return String(value);
  return `${Number((value / 1000).toFixed(1))}K`;
}

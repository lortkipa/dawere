// URL search params of the admin lists: search, filters, sort and page.

export type SearchParams = { [key: string]: string | string[] | undefined };

export const adminPageSize = 50;

export function param(params: SearchParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

// One of `allowed`, or the first one when the URL has something else.
export function choice<T extends string>(params: SearchParams, key: string, allowed: readonly T[]): T {
  const value = param(params, key);
  return (allowed as readonly string[]).includes(value) ? (value as T) : allowed[0];
}

export function pageParam(params: SearchParams) {
  const page = Number(param(params, "page"));
  return Number.isInteger(page) && page > 1 ? page : 1;
}

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

// A yyyy-mm-dd from a date input, or "" for anything else.
export function dayParam(params: SearchParams, key: string) {
  const value = param(params, key);
  return isoDay.test(value) && !Number.isNaN(new Date(value).getTime()) ? value : "";
}

// For ILIKE: % and _ in what the admin typed match themselves.
export function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

// The same list with one param changed; "" removes it. Changing anything but the page goes back
// to page 1.
export function withParam(path: string, params: SearchParams, key: string, value: string) {
  const next = new URLSearchParams();
  for (const [name, raw] of Object.entries(params)) {
    const current = Array.isArray(raw) ? raw[0] : raw;
    if (current && name !== key && !(key !== "page" && name === "page")) next.set(name, current);
  }
  if (value) next.set(key, value);
  const query = next.toString();
  return query ? `${path}?${query}` : path;
}

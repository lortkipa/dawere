"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../button";
import { popoverClass, useDismiss } from "../menu";

type Option = { value: string; label: string };

// A filter whose empty value means "all".
export type FilterDef = { name: string; label: string; options: Option[] };

type Values = Record<string, string>;

const fieldClass =
  "h-10 rounded-lg border border-line bg-bg text-[15px] text-ink outline-offset-0 transition-colors focus:border-ink";

// Spelled out by hand: browsers without Georgian locale data would render Intl's English
// fallback and differ from the server's HTML.
const months = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];

// "2026-10-01" → "1 ოქტ. 2026"
function shortDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${months[month - 1]}. ${year}`;
}

// Search, a filters popover and the sort, in one row; the filters in use show below as chips.
// Everything lives in the URL: `values` comes back from the server parsed. The search applies
// as you type, the popover on „ჩვენება“, the sort and a chip's × at once.
export function FilterBar({
  path,
  values,
  searchLabel,
  filters,
  dateRange,
  sorts,
  scopes = [],
}: {
  path: string;
  values: Values;
  searchLabel: string;
  filters: FilterDef[];
  // The label of a from–to date filter kept in `from` and `to`.
  dateRange?: string;
  sorts: Option[];
  // Params set by a link from elsewhere (an author, a blog), shown as chips that can be removed.
  scopes?: { name: string; label: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(values.q ?? "");
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss(open, wrapper, close);

  function go(next: Values) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      // The first sort is the default and stays out of the URL.
      if (value && !(key === "sort" && value === sorts[0].value)) params.set(key, value);
    }
    const search = params.toString();
    router.push(search ? `${path}?${search}` : path, { scroll: false });
  }

  // Typing searches after a short pause.
  useEffect(() => {
    if (query.trim() === (values.q ?? "")) return;
    const timer = setTimeout(() => go({ ...values, q: query.trim() }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const active: { key: string; label: string; clear: Values }[] = scopes
    .filter((scope) => values[scope.name])
    .map((scope) => ({ key: scope.name, label: scope.label, clear: { [scope.name]: "" } }));
  for (const filter of filters) {
    const option = filter.options.find((item) => item.value && item.value === values[filter.name]);
    if (option)
      active.push({ key: filter.name, label: `${filter.label}: ${option.label}`, clear: { [filter.name]: "" } });
  }
  if (dateRange && (values.from || values.to)) {
    const from = values.from ? shortDay(values.from) : "…";
    const to = values.to ? shortDay(values.to) : "…";
    active.push({ key: "dates", label: `${dateRange}: ${from} – ${to}`, clear: { from: "", to: "" } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={wrapper} className="relative flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Icon className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </Icon>
          <input
            type="search"
            aria-label={searchLabel}
            placeholder={searchLabel}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") go({ ...values, q: query.trim() });
            }}
            className={`${fieldClass} w-full pr-3 pl-10 placeholder:text-faint`}
          />
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((value) => !value)}
          className={`${fieldClass} flex flex-1 cursor-pointer items-center justify-center gap-2 px-3 hover:bg-surface sm:flex-none`}
        >
          <Icon>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </Icon>
          ფილტრები
          {active.length > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-ink text-xs font-medium text-bg tabular-nums">
              {active.length}
            </span>
          )}
        </button>

        <div className="relative flex-1 sm:flex-none">
          <Icon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
          </Icon>
          <select
            aria-label="დალაგება"
            value={values.sort || sorts[0].value}
            onChange={(event) => go({ ...values, q: query.trim(), sort: event.target.value })}
            className={`${fieldClass} w-full cursor-pointer appearance-none pr-9 pl-10`}
          >
            {sorts.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Icon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">
            <path d="m6 9 6 6 6-6" />
          </Icon>
        </div>

        {open && (
          <FilterPanel
            values={values}
            filters={filters}
            dateRange={dateRange}
            onApply={(picked) => {
              close();
              go({ ...values, q: query.trim(), ...picked });
            }}
          />
        )}
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {active.map((item) => (
            <span
              key={item.key}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-surface pr-1 pl-3 text-sm"
            >
              {item.label}
              <button
                type="button"
                aria-label={`${item.label} — მოხსნა`}
                onClick={() => go({ ...values, q: query.trim(), ...item.clear })}
                className="grid size-6 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-active hover:text-ink"
              >
                <Icon small>
                  <path d="M18 6 6 18M6 6l12 12" />
                </Icon>
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => go({ q: query.trim(), sort: values.sort ?? "" })}
            className="h-8 cursor-pointer rounded-full px-3 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            ყველას მოხსნა
          </button>
        </div>
      )}
    </div>
  );
}

// The picks stay here until „ჩვენება“, so trying options doesn't reload the list each time.
function FilterPanel({
  values,
  filters,
  dateRange,
  onApply,
}: {
  values: Values;
  filters: FilterDef[];
  dateRange?: string;
  onApply: (picked: Values) => void;
}) {
  const initial = () => {
    const picked: Values = {};
    for (const filter of filters) picked[filter.name] = values[filter.name] ?? "";
    if (dateRange) {
      picked.from = values.from ?? "";
      picked.to = values.to ?? "";
    }
    return picked;
  };
  const [picked, setPicked] = useState(initial);
  const set = (key: string, value: string) => setPicked((current) => ({ ...current, [key]: value }));
  const cleared = Object.fromEntries(Object.keys(picked).map((key) => [key, ""]));

  return (
    <div
      role="dialog"
      aria-label="ფილტრები"
      className={`${popoverClass} right-0 left-0 flex max-h-[min(70dvh,36rem)] flex-col sm:left-auto sm:w-[26rem]`}
    >
      <div className="flex flex-col gap-5 overflow-y-auto p-4">
        {filters.map((filter) => (
          <fieldset key={filter.name}>
            <legend className="mb-2 text-sm font-medium">{filter.label}</legend>
            <div className="flex flex-wrap gap-1.5">
              {[{ value: "", label: "ყველა" }, ...filter.options].map((option) => (
                <Pill
                  key={option.value}
                  selected={picked[filter.name] === option.value}
                  onClick={() => set(filter.name, option.value)}
                >
                  {option.label}
                </Pill>
              ))}
            </div>
          </fieldset>
        ))}
        {dateRange && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{dateRange}</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted">
                დან
                <input
                  type="date"
                  value={picked.from}
                  max={picked.to || undefined}
                  onChange={(event) => set("from", event.target.value)}
                  className={`${fieldClass} min-w-0 px-3`}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                მდე
                <input
                  type="date"
                  value={picked.to}
                  min={picked.from || undefined}
                  onChange={(event) => set("to", event.target.value)}
                  className={`${fieldClass} min-w-0 px-3`}
                />
              </label>
            </div>
          </fieldset>
        )}
      </div>
      <div className="flex justify-between gap-2 border-t border-line p-3">
        <Button variant="ghost" onClick={() => setPicked(cleared)}>
          გასუფთავება
        </Button>
        <Button onClick={() => onApply(picked)}>ჩვენება</Button>
      </div>
    </div>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-8 cursor-pointer rounded-full border px-3 text-sm transition-colors ${
        selected ? "border-ink bg-ink text-bg" : "border-line bg-bg text-ink hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}

function Icon({
  className = "",
  small = false,
  children,
}: {
  className?: string;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${small ? "size-3.5" : "size-[18px]"} shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

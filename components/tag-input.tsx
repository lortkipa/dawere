"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type { Option } from "@/lib/onboarding-options";
import { maxTagLength, maxTags, normalizeTag, tagView } from "@/lib/tags";
import { popoverClass } from "./menu";

type Suggestion = { tag: string; emoji?: string; label: string; custom?: boolean };

// Picked tags as chips, then a field that suggests the onboarding topics while you type. Anything
// else that is a valid tag can be added as the author's own.
export function TagInput({
  ref,
  tags,
  onChange,
  onDone,
  topics,
}: {
  ref: RefObject<HTMLInputElement | null>;
  tags: string[];
  onChange: (tags: string[]) => void;
  // Enter in the empty field: the author is done with tags.
  onDone: () => void;
  topics: Option[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // -1 while nothing is highlighted, so Enter in the empty field moves on.
  const [active, setActive] = useState(-1);
  const listId = useId();
  const list = useRef<HTMLUListElement>(null);

  const typed = query.trim().replace(/^#+/, "").toLowerCase();
  const normalized = normalizeTag(query, topics);
  const suggestions: Suggestion[] = topics
    .filter((topic) => !tags.includes(topic.slug))
    .filter((topic) => !typed || topic.label.toLowerCase().includes(typed) || topic.slug.startsWith(typed))
    .map((topic) => ({ tag: topic.slug, emoji: topic.emoji, label: topic.label }));
  if (normalized && !tags.includes(normalized) && !topics.some((topic) => topic.slug === normalized)) {
    suggestions.push({ tag: normalized, label: normalized, custom: true });
  }
  const invalid = typed !== "" && !normalized;
  const full = tags.length >= maxTags;

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function add(tag: string) {
    if (!tags.includes(tag)) onChange([...tags, tag]);
    setQuery("");
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (suggestions.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const picked = suggestions[active];
      if (picked) add(picked.tag);
      else if (event.key === "Enter" && !typed) onDone();
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Backspace" && query === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="relative z-45 mt-5">
      <div className="flex flex-wrap items-center gap-2" onClick={() => ref.current?.focus()}>
        <TagIcon />
        {tags.map((tag) => {
          const view = tagView(tag, topics);
          return (
            <span
              key={tag}
              className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-line bg-surface pr-1 pl-3 text-sm text-ink"
            >
              <span aria-hidden="true" className={view.emoji ? "" : "text-muted"}>
                {view.emoji ?? "#"}
              </span>
              <span className="truncate">{view.label}</span>
              <button
                type="button"
                aria-label={`${view.label}: წაშლა`}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(tags.filter((item) => item !== tag));
                }}
                className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-[#e9e9e7] hover:text-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </span>
          );
        })}
        {!full && (
          <input
            ref={ref}
            role="combobox"
            aria-label="თეგები"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
            placeholder={tags.length === 0 ? "დაამატე თეგები" : "დაამატე თეგი"}
            maxLength={maxTagLength + 1}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActive(event.target.value.trim() ? 0 : -1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            className="h-8 min-w-36 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#b4b4b2]"
          />
        )}
      </div>

      {open && !full && (suggestions.length > 0 || invalid) && (
        <div className={`${popoverClass} left-0 w-full p-1.5 sm:w-80`}>
          {invalid ? (
            <p className="px-3 py-2 text-sm text-muted">თეგში შეიძლება იყოს მხოლოდ ასოები, ციფრები და ტირე.</p>
          ) : (
            <ul ref={list} id={listId} role="listbox" aria-label="თეგები" className="max-h-72 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.tag}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Keeps the focus in the field, so the list doesn't close before the click.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => add(suggestion.tag)}
                  onMouseMove={() => setActive(index)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[15px] text-ink ${
                    index === active ? "bg-surface" : ""
                  }`}
                >
                  <span aria-hidden="true" className={`w-5 text-center ${suggestion.custom ? "text-muted" : ""}`}>
                    {suggestion.emoji ?? "#"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{suggestion.label}</span>
                  {suggestion.custom && <span className="shrink-0 text-sm text-muted">ახალი თეგი</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function TagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px] shrink-0 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" />
      <circle cx="7.5" cy="7.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

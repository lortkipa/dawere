'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

const MAX_TAGS = 5;

export function TagInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
}) {
  const [draft, setDraft] = useState('');

  function add(raw: string) {
    const name = raw.trim().replace(/,$/, '').slice(0, 40);
    if (!name) return;
    const exists = value.some((t) => t.toLowerCase() === name.toLowerCase());
    if (!exists && value.length < MAX_TAGS) onChange([...value, name]);
    setDraft('');
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
      return;
    }
    // Backspace on an empty box removes the last tag — the usual convention.
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <div className="-mx-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 transition-colors hover:border-line focus-within:border-line-strong">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-sunken py-0.5 pr-1 pl-2 text-[13px] font-medium text-ink ring-1 ring-line ring-inset"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`${tag} — წაშლა`}
              className="flex size-4 items-center justify-center rounded-sm text-subtle transition-colors hover:bg-hover hover:text-ink"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => add(draft)}
            list="dawere-topic-suggestions"
            placeholder={value.length === 0 ? 'დაამატე 5 თემამდე…' : 'დაამატე კიდევ…'}
            aria-label="თემის დამატება"
            className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm text-ink placeholder:text-subtle focus:outline-none"
          />
        ) : null}
      </div>
      <datalist id="dawere-topic-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Check, Copy, Loader2, MoreHorizontal, Search, X } from 'lucide-react';
import { Button, FormError, INPUT_CLASS, MENU_CLASS, MENU_ITEM_CLASS } from '@/components/ui';
import { cn } from '@/lib/utils';

/* ----------------------------------------------------------------- dropdown */

export type MenuItem =
  | { label: string; icon: ReactNode; href: string; danger?: boolean }
  | { label: string; icon: ReactNode; onSelect: () => void; danger?: boolean };

/**
 * The ⋯ button on a table row. Items are links or callbacks; `null` draws a
 * divider. The menu is fixed-positioned against the button: tables scroll
 * sideways inside an overflow box, which would otherwise clip it.
 */
export function RowMenu({ items, label = 'მოქმედებები' }: { items: (MenuItem | null)[]; label?: string }) {
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const open = position !== null;

  function toggle() {
    if (open) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current!.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    // Open upward when the lower part of the viewport has no room for it.
    setPosition(
      rect.bottom > window.innerHeight * 0.55
        ? { position: 'fixed', right, bottom: window.innerHeight - rect.top + 4 }
        : { position: 'fixed', right, top: rect.bottom + 4 },
    );
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    // A fixed menu would drift away from its row; closing is the honest answer.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="flex size-8 items-center justify-center rounded-full text-subtle transition-colors hover:bg-hover hover:text-ink"
      >
        <MoreHorizontal className="size-[18px]" />
      </button>
      {position ? (
        <div role="menu" style={position} className={cn(MENU_CLASS, 'w-56')}>
          {items.map((item, index) => {
            if (!item) return <div key={`d${index}`} className="-mx-1.5 my-1.5 border-t border-line" />;
            const className = cn(MENU_ITEM_CLASS, item.danger && 'text-danger hover:bg-danger-soft hover:text-danger');
            return 'href' in item ? (
              <Link key={item.label} href={item.href} role="menuitem" className={className}>
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={className}
                onClick={() => {
                  setPosition(null);
                  item.onSelect();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- list controls */

export type FilterDef = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * Search box plus filter selects, all kept in the URL so every view of a list
 * can be bookmarked or shared with another admin. Typing waits for a pause
 * before navigating; a filter change navigates at once. Either resets paging.
 */
export function ListControls({
  placeholder,
  q,
  filters,
  values,
}: {
  placeholder: string;
  q: string;
  filters: FilterDef[];
  /**
   * Every current URL parameter except `q` and `page`, by name: the filters'
   * values plus any the page set itself (a post list scoped to one author).
   */
  values: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(q);
  const [pending, startTransition] = useTransition();

  function go(patch: Record<string, string>) {
    const next = { q: text.trim(), ...values, ...patch };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  // Debounced search. Once the URL catches up, `q` matches and this settles.
  useEffect(() => {
    if (text.trim() === q) return;
    const timer = setTimeout(() => go({ q: text.trim() }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <form
        role="search"
        className="relative min-w-0 flex-1 sm:min-w-64"
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: text.trim() });
        }}
      >
        {pending ? (
          <Loader2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-subtle" />
        ) : (
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
        )}
        <input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          maxLength={200}
          className={cn(INPUT_CLASS, 'h-9 pr-9 pl-9 text-sm [&::-webkit-search-cancel-button]:appearance-none')}
        />
        {text ? (
          <button
            type="button"
            onClick={() => {
              setText('');
              go({ q: '' });
            }}
            aria-label="გასუფთავება"
            className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-subtle hover:bg-hover hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <label key={filter.name} className="relative">
            <span className="sr-only">{filter.label}</span>
            <select
              value={values[filter.name] ?? ''}
              onChange={(event) => go({ [filter.name]: event.target.value })}
              className={cn(INPUT_CLASS, 'h-9 w-auto cursor-pointer py-0 pr-8 text-sm')}
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- selection */

/** Checkbox selection over the rows currently on screen. */
export function useSelection(ids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const key = ids.join(',');

  // A new page of rows starts with nothing selected.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visible = useMemo(() => new Set(ids), [key]);
  const chosen = useMemo(() => [...selected].filter((id) => visible.has(id)), [selected, visible]);

  return {
    selected: chosen,
    has: (id: string) => selected.has(id) && visible.has(id),
    toggle: (id: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    allChecked: ids.length > 0 && chosen.length === ids.length,
    someChecked: chosen.length > 0 && chosen.length < ids.length,
    toggleAll: () => setSelected(chosen.length === ids.length ? new Set() : new Set(ids)),
    clear: () => setSelected(new Set()),
  };
}

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="size-4 cursor-pointer rounded border-line-strong accent-[var(--accent)]"
    />
  );
}

/** Appears above a table while rows are selected. */
export function BulkBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="animate-pop-in mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-accent/25 bg-accent-soft px-3 py-2">
      <span className="mr-auto text-[13px] font-medium text-accent">მონიშნულია: {count}</span>
      {children}
      <Button variant="ghost" size="sm" onClick={onClear}>
        გაუქმება
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------- tables */

export const TABLE_CLASS = 'w-full min-w-[42rem] border-collapse text-left text-sm';
export const TH_CLASS = 'px-3 py-2.5 text-[12px] font-medium whitespace-nowrap text-muted first:pl-4 last:pr-4';
export const TD_CLASS = 'px-3 py-3 align-middle first:pl-4 last:pr-4';

export function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-raised">
      <table className={TABLE_CLASS}>{children}</table>
    </div>
  );
}

/* ------------------------------------------------------------------ dialogs */

function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return ref;
}

const DIALOG_CLASS =
  'm-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-raised p-0 text-ink shadow-lift';

/**
 * A confirmation with room for a form: a password for the irreversible
 * actions, a reason for a suspension. `onConfirm` receives the form's data.
 */
export function FormDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  pending,
  error,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  pending: boolean;
  error?: string;
  onConfirm: (data: FormData) => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const ref = useModal(open);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current && !pending) onClose();
      }}
      className={DIALOG_CLASS}
    >
      {open ? (
        <form
          className="p-6"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(new FormData(event.currentTarget));
          }}
        >
          <h2 className="headline text-[1.35rem] text-ink">{title}</h2>
          {description ? <div className="mt-1.5 text-sm leading-relaxed text-muted">{description}</div> : null}
          {children ? <div className="mt-5 space-y-4">{children}</div> : null}
          {error ? (
            <div className="mt-4">
              <FormError>{error}</FormError>
            </div>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              გაუქმება
            </Button>
            <Button type="submit" variant={tone === 'danger' ? 'danger' : 'primary'} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}

/** Shows a generated password exactly once, with a copy button. */
export function SecretDialog({
  secret,
  title,
  description,
  onClose,
}: {
  secret: string | null;
  title: string;
  description: ReactNode;
  onClose: () => void;
}) {
  const ref = useModal(Boolean(secret));
  const [copied, setCopied] = useState(false);

  return (
    <dialog ref={ref} onClose={onClose} className={DIALOG_CLASS}>
      {secret ? (
        <div className="p-6">
          <h2 className="headline text-[1.35rem] text-ink">{title}</h2>
          <div className="mt-1.5 text-sm leading-relaxed text-muted">{description}</div>
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-sunken py-2 pr-2 pl-3">
            <code className="min-w-0 flex-1 truncate font-mono text-[15px] text-ink select-all">{secret}</code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  // Clipboard can be blocked; the text is selectable either way.
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
              {copied ? 'დაკოპირდა' : 'კოპირება'}
            </Button>
          </div>
          <p className="mt-3 text-[13px] text-subtle">ამ ფანჯრის დახურვის შემდეგ პაროლს ვეღარ ნახავ.</p>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={onClose} autoFocus>
              მზადაა
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

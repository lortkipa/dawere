'use client';

import { useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; tone: Tone };

/**
 * A module-level store rather than a context: `toast()` can then be called from
 * any client code — an event handler, a transition, a hook — without threading
 * a provider through the tree. The <Toaster /> in the root layout renders it.
 */
let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((notify) => notify());
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(message: string, tone: Tone = 'success') {
  const id = nextId++;
  // Three at most: a burst of errors should not paper over the page.
  toasts = [...toasts.slice(-2), { id, message, tone }];
  emit();
  setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3200);
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

const EMPTY: Toast[] = [];

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function Toaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY,
  );

  return (
    <div
      aria-live="polite"
      className="toaster pointer-events-none fixed right-[var(--ask-inset,0px)] bottom-6 left-0 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {items.map((item) => {
        const Icon = ICONS[item.tone];
        return (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className="animate-toast-in pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-line bg-raised py-2.5 pr-2 pl-3.5 text-sm text-ink shadow-lift"
          >
            <Icon
              className={cn(
                'size-4 shrink-0',
                item.tone === 'error' ? 'text-danger' : item.tone === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle',
              )}
            />
            <span className="min-w-0 flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle transition-colors hover:bg-hover hover:text-ink"
              aria-label="დახურვა"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

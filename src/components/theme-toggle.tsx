'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * The theme lives on <html> (set by the inline script in the root layout before
 * first paint), so the DOM — not React — is the source of truth. Reading it
 * through useSyncExternalStore keeps the button honest without a post-mount
 * effect, and the server snapshot renders a neutral placeholder so hydration
 * never mismatches.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark');
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('dawere-theme', next ? 'dark' : 'light');
    } catch {
      // Private mode: the preference simply will not persist.
    }
    listeners.forEach((notify) => notify());
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink"
      aria-label={dark ? 'ღია თემაზე გადართვა' : 'მუქ თემაზე გადართვა'}
    >
      {dark === null ? (
        <span className="size-4" aria-hidden />
      ) : dark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}

'use client';

import { useLayoutEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'dawere-theme';

/**
 * Applies the stored theme before first paint. Without this the page flashes
 * light before React hydrates and the toggle catches up.
 */
const THEME_SCRIPT = `
try {
  var stored = localStorage.getItem('${STORAGE_KEY}');
  var dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
} catch (e) {}
`;

function applyStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch {
    // Storage blocked: keep whatever the page already has.
  }
}

const noopSubscribe = () => () => {};

/**
 * The inline script only runs when it arrives in the server HTML. When React
 * renders the document on the client instead — a `notFound()` page does, since
 * the error aborts hydration of the whole root — the script is inert, React
 * warns about it, and <html> is rebuilt without the `dark` class. So the tag is
 * rendered only while hydrating server HTML, and the layout effect re-applies
 * the theme before paint in either case.
 */
export function ThemeScript() {
  const fromServer = useSyncExternalStore(noopSubscribe, () => false, () => true);

  useLayoutEffect(applyStoredTheme, []);

  return fromServer ? <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /> : null;
}

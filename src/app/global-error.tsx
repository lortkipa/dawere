'use client';

import { useEffect } from 'react';

/**
 * The last line of defence, used only when the root layout itself fails. It
 * replaces the whole document, so it carries its own minimal styling and
 * follows the OS colour scheme (the app's theme class cannot reach it).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ka">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: 'Canvas',
          color: 'CanvasText',
          colorScheme: 'light dark',
        }}
      >
        <title>შეცდომა · Dawere</title>
        <main style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>რაღაც არასწორად წავიდა</h1>
          <p style={{ opacity: 0.7, lineHeight: 1.6 }}>გვერდი ვერ ჩაიტვირთა. სცადე თავიდან.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              borderRadius: 999,
              border: '1px solid currentColor',
              background: 'transparent',
              color: 'inherit',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            თავიდან ცდა
          </button>
        </main>
      </body>
    </html>
  );
}

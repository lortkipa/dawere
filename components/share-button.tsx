"use client";

import { useEffect, useState } from "react";
import { actionClass } from "./like-button";

// Phones open the system share sheet; elsewhere the link goes to the clipboard.
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closing the sheet is not a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("დააკოპირე ბმული", url);
    }
  };

  return (
    <button type="button" aria-label="გაზიარება" onClick={share} className={`${actionClass} ml-auto h-9`}>
      {copied && (
        <span role="status" className="text-sm">
          ბმული დაკოპირდა
        </span>
      )}
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {copied ? (
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        ) : (
          <>
            <path d="M12 3.5v11" />
            <path d="m7.5 8 4.5-4.5L16.5 8" />
            <path d="M8 11.5H6.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H16" />
          </>
        )}
      </svg>
    </button>
  );
}

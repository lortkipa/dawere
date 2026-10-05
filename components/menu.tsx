"use client";

import Link from "next/link";
import { useEffect, type ReactNode, type RefObject } from "react";

// A card that drops down from its trigger; add a side (left-0 or right-0), a width and padding.
export const popoverClass = "absolute top-full z-20 mt-2 rounded-xl border border-line bg-bg shadow-lg";

export const menuClass = `${popoverClass} right-0 p-1.5`;

const itemBase =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-[15px] transition-colors";

export const itemClass = `${itemBase} text-ink hover:bg-surface`;

// For leaving or reporting: red text and icon, with a faint red hover.
export const dangerItemClass = `${itemBase} text-danger hover:bg-danger-soft [&_svg]:text-red-500`;

// Closes an open menu on a pointer press outside `ref` or on Escape.
export function useDismiss(open: boolean, ref: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, close]);
}

// Renders a <Link> when given an href; otherwise a button.
export function MenuItem({
  icon,
  danger = false,
  href,
  onClick,
  children,
}: {
  icon: ReactNode;
  danger?: boolean;
  href?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} role="menuitem" onClick={onClick} className={danger ? dangerItemClass : itemClass}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} className={danger ? dangerItemClass : itemClass}>
      {icon}
      {children}
    </button>
  );
}

export function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px] shrink-0 text-muted"
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

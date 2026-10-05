"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "../avatar";

export type NavUser = { name: string; email: string; avatar?: string; role: string };

const sections = [
  { href: "/admin", label: "მიმოხილვა", icon: <OverviewIcon /> },
  { href: "/admin/users", label: "მომხმარებლები", icon: <UsersIcon /> },
  { href: "/admin/blogs", label: "ბლოგები", icon: <BlogsIcon /> },
  { href: "/admin/comments", label: "კომენტარები", icon: <CommentsIcon /> },
  { href: "/admin/categories", label: "კატეგორიები", icon: <CategoriesIcon /> },
];

// The sidebar on wide screens; under md a top bar whose button slides the same sidebar in from
// the right.
export function AdminNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Following a link closes the drawer.
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const root = document.documentElement;
    root.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = (
    <nav aria-label="ადმინის განყოფილებები" className="flex flex-col gap-0.5">
      {sections.map((section) => {
        const active = section.href === "/admin" ? pathname === "/admin" : pathname.startsWith(section.href);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            onClick={close}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors ${
              active ? "bg-active font-medium text-ink" : "text-muted hover:bg-hover hover:text-ink"
            }`}
          >
            {section.icon}
            {section.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="flex flex-col gap-1 border-t border-line pt-3">
      <div className="flex items-center gap-3 px-3 py-2">
        <Avatar src={user.avatar} className="size-8" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{user.name || user.email}</p>
          <p className="truncate text-xs text-muted">{user.role}</p>
        </div>
      </div>
      <Link
        href="/"
        onClick={close}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <BackIcon />
        საიტზე დაბრუნება
      </Link>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface p-3 md:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">{links}</div>
        {footer}
      </aside>

      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-bg px-4 md:hidden">
        <Brand />
        <button
          type="button"
          aria-label="მენიუ"
          aria-expanded={open}
          aria-controls="admin-drawer"
          onClick={() => setOpen(true)}
          className="-mr-2 grid size-10 cursor-pointer place-items-center rounded-lg text-ink transition-colors hover:bg-surface"
        >
          <NavIcon>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </NavIcon>
        </button>
      </div>

      {/* Kept in the DOM so it can slide; inert while closed. */}
      <div className="md:hidden" inert={!open}>
        <div
          aria-hidden="true"
          onClick={close}
          className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
        <aside
          id="admin-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="მენიუ"
          className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 bg-surface p-3 shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <Brand onClick={close} />
            <button
              type="button"
              aria-label="დახურვა"
              onClick={close}
              className="grid size-10 cursor-pointer place-items-center rounded-lg text-ink transition-colors hover:bg-hover"
            >
              <NavIcon>
                <path d="M18 6 6 18M6 6l12 12" />
              </NavIcon>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{links}</div>
          <div className="pb-[env(safe-area-inset-bottom)]">{footer}</div>
        </aside>
      </div>
    </>
  );
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/admin" onClick={onClick} className="flex items-baseline gap-2 rounded-md px-3 py-1 select-none">
      <span className="text-[22px] font-extrabold tracking-tight text-ink">dawere</span>
      <span className="text-sm text-muted">ადმინი</span>
    </Link>
  );
}

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px] shrink-0"
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

function OverviewIcon() {
  return (
    <NavIcon>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-6" />
    </NavIcon>
  );
}

function UsersIcon() {
  return (
    <NavIcon>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M16 4.1a4 4 0 0 1 0 7.8M18 14.5a7 7 0 0 1 4 6.5" />
    </NavIcon>
  );
}

function BlogsIcon() {
  return (
    <NavIcon>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </NavIcon>
  );
}

function CommentsIcon() {
  return (
    <NavIcon>
      <path d="M20.5 11.5a8.5 8 0 0 1-12.2 7.2L3.5 20l1.4-4.1a8.5 8 0 1 1 15.6-4.4z" />
    </NavIcon>
  );
}

function CategoriesIcon() {
  return (
    <NavIcon>
      <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </NavIcon>
  );
}

function BackIcon() {
  return (
    <NavIcon>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </NavIcon>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authUrl } from "@/lib/return-to";
import { Button } from "./button";
import { Logo } from "./logo";
import { UserMenu, type MenuUser } from "./user-menu";

export function Header({ bare = false, user }: { bare?: boolean; user?: MenuUser }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const writing = pathname === "/write";
  // Signing in from a post or a profile brings the reader back to it.
  const signIn = authUrl(pathname === "/" || pathname === "/auth" ? null : pathname);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled
          ? "border-line bg-bg"
          : "border-transparent bg-transparent in-data-chat-open:border-line! in-data-chat-open:bg-bg!"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        {!bare && user && (
          <div className="flex items-center gap-2 sm:gap-3">
            {!writing && (
              <Button variant="ghost" href="/write" className="gap-2 px-3">
                <svg
                  viewBox="0 0 24 24"
                  className="size-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
                დაწერე
              </Button>
            )}
            <UserMenu user={user} />
          </div>
        )}
        {!bare && !user && (
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" href={signIn}>
              შესვლა
            </Button>
            <Button href="/auth">დაიწყე წერა</Button>
          </div>
        )}
      </div>
    </header>
  );
}

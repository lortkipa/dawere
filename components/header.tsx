"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import { Logo } from "./logo";
import { UserMenu, type MenuUser } from "./user-menu";

export function Header({ bare = false, user }: { bare?: boolean; user?: MenuUser }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled ? "border-line bg-white" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        {!bare && user && <UserMenu user={user} />}
        {!bare && !user && (
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" href="/auth">
              შესვლა
            </Button>
            <Button href="/auth">დაიწყე წერა</Button>
          </div>
        )}
      </div>
    </header>
  );
}

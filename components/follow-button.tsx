"use client";

import { usePathname } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { setFollow } from "@/app/follow/actions";
import { authUrl } from "@/lib/return-to";
import { Button } from "./button";

// `followed` comes from the server. The toggle shows at once and the page refreshes with the
// stored value when the action finishes; if it fails, the server value comes back.
export function useFollow(authorId: string, followed: boolean) {
  const [optimistic, setOptimistic] = useOptimistic(followed);
  const [, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      setOptimistic(!optimistic);
      await setFollow(authorId, !optimistic);
    });

  return [optimistic, toggle] as const;
}

export function FollowButton({
  signedIn,
  followed,
  onToggle,
  size = "md",
  className = "",
}: {
  signedIn: boolean;
  followed: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const pathname = usePathname();

  // Signing in brings the reader back to this page.
  if (!signedIn) {
    return (
      <Button href={authUrl(pathname)} size={size} className={className}>
        გამოწერა
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={followed ? "outline" : "primary"}
      aria-pressed={followed}
      onClick={onToggle}
      className={className}
    >
      {followed ? "გამოწერილი" : "გამოწერა"}
    </Button>
  );
}

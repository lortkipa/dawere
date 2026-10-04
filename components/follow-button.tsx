"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { authUrl } from "@/lib/return-to";
import { Button } from "./button";

// Follows don't exist yet: following lives in client state only and resets on reload.
export function FollowButton({
  signedIn,
  size = "md",
  className = "",
  onChange,
}: {
  signedIn: boolean;
  size?: "sm" | "md";
  className?: string;
  onChange?: (followed: boolean) => void;
}) {
  const [followed, setFollowed] = useState(false);
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
      onClick={() => {
        setFollowed(!followed);
        onChange?.(!followed);
      }}
      className={className}
    >
      {followed ? "გამოწერილი" : "გამოწერა"}
    </Button>
  );
}

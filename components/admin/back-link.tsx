import Link from "next/link";

export function BackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="flex w-fit items-center gap-2 rounded-md text-sm text-muted transition-colors hover:text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {children}
    </Link>
  );
}

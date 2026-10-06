import Link from "next/link";
import { Logo } from "./logo";

const linkClass = "transition-colors hover:text-ink";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-8 sm:px-6">
        <Logo />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          <Link href="/help" className={linkClass}>
            დახმარება
          </Link>
          <Link href="/terms" className={linkClass}>
            წესები
          </Link>
          <Link href="/privacy" className={linkClass}>
            კონფიდენციალურობა
          </Link>
          <p>© 2026</p>
        </div>
      </div>
    </footer>
  );
}

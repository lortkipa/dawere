import Link from 'next/link';
import { Logo } from '@/components/logo';
import { SUPPORT_EMAIL } from '@/lib/site';

const LINKS = [
  { href: '/search', label: 'აღმოაჩინე' },
  { href: '/write', label: 'დაწერე', prefetch: false },
  { href: '/terms', label: 'წესები' },
  { href: '/privacy', label: 'კონფიდენციალურობა' },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-sunken/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo />
          <p className="mt-2 text-[13px] text-subtle">ტექსტები, რომლებიც ღირს წაკითხვად.</p>
        </div>
        <nav aria-label="ქვედა ნავიგაცია" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={link.prefetch}
              className="transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          {SUPPORT_EMAIL ? (
            <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-ink">
              კონტაქტი
            </a>
          ) : null}
          <span className="text-subtle">© {new Date().getFullYear()} Dawere</span>
        </nav>
      </div>
    </footer>
  );
}

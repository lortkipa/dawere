'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Flag,
  History,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Tags,
  Users,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { cn } from '@/lib/utils';

type AdminUser = { name: string; username: string; avatarUrl: string | null; isAdmin?: boolean };
/** Counts shown beside a section: things waiting for an admin. */
type Badges = Partial<Record<string, number>>;

function CountBadge({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        'rounded-full bg-danger px-1.5 text-[11px] leading-[18px] font-semibold text-danger-contrast tabular-nums',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

const ITEMS = [
  { href: '/admin', label: 'მიმოხილვა', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'მომხმარებლები', icon: Users },
  { href: '/admin/posts', label: 'სტატიები', icon: FileText },
  { href: '/admin/comments', label: 'კომენტარები', icon: MessageSquare },
  { href: '/admin/reports', label: 'საჩივრები', icon: Flag },
  { href: '/admin/topics', label: 'თემები', icon: Tags },
  { href: '/admin/team', label: 'გუნდი', icon: ShieldCheck },
  { href: '/admin/log', label: 'ჟურნალი', icon: History },
];

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
}

/** The admin area's own rail: same shape as the app sidebar, different destinations. */
export function AdminSidebar({ user, badges = {} }: { user: AdminUser; badges?: Badges }) {
  const isActive = useActive();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[4.5rem] shrink-0 flex-col self-start border-r border-line bg-surface px-3 py-4 md:flex xl:w-60 xl:px-4">
      <Link href="/admin" aria-label="ადმინისტრირება" className="mb-6 flex h-9 items-center justify-center gap-2 xl:justify-start xl:px-2">
        <LogoMark className="xl:hidden" />
        <Logo className="hidden xl:block" />
        <span className="hidden rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent xl:inline">
          ადმინი
        </span>
      </Link>

      <nav aria-label="ადმინისტრირება" className="flex flex-col gap-0.5">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-10 items-center justify-center gap-3 rounded-full text-sm font-medium transition-colors xl:justify-start xl:px-3.5',
                active ? 'bg-hover text-ink' : 'text-muted hover:bg-hover hover:text-ink',
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
              <span className="sr-only xl:not-sr-only">{label}</span>
              <CountBadge count={badges[href]} className="absolute top-0.5 right-0.5 xl:static xl:ml-auto" />
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        title="საიტზე დაბრუნება"
        className="mt-5 flex h-10 items-center justify-center gap-3 rounded-full text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-ink xl:justify-start xl:px-3.5"
      >
        <ArrowLeft className="size-[18px] shrink-0" strokeWidth={1.75} />
        <span className="sr-only xl:not-sr-only">საიტზე დაბრუნება</span>
      </Link>

      <div className="mt-auto flex flex-col items-center gap-2 border-t border-line pt-4 xl:flex-row xl:gap-1">
        <UserMenu {...user} placement="top" variant="row" className="xl:min-w-0 xl:flex-1" />
        <ThemeToggle />
      </div>
    </aside>
  );
}

/** Phones: a top bar plus a scrolling strip of sections. */
export function AdminMobileBar({ user, badges = {} }: { user: AdminUser; badges?: Badges }) {
  const isActive = useActive();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-xl md:hidden">
      <div className="flex h-14 items-center gap-1 px-4">
        <Link href="/" aria-label="საიტზე დაბრუნება" className="mr-auto flex items-center gap-2">
          <Logo />
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">ადმინი</span>
        </Link>
        <ThemeToggle />
        <div className="ml-1.5">
          <UserMenu {...user} />
        </div>
      </div>
      <nav aria-label="ადმინისტრირება" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2">
        {ITEMS.map(({ href, label, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                active ? 'bg-hover text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {label}
              <CountBadge count={badges[href]} />
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

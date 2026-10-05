import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@/lib/db/schema";
import { withParam, type SearchParams } from "@/lib/admin-list";
import { roleLabels } from "@/lib/roles";

export function PageTitle({ title, count, children }: { title: string; count?: number; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="flex items-baseline gap-3 text-2xl font-bold tracking-[-0.01em]">
        {title}
        {count !== undefined && <span className="text-base font-normal text-muted tabular-nums">{count}</span>}
      </h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// Tables scroll sideways on narrow screens instead of squeezing their columns.
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[720px] border-collapse text-left text-[15px]">{children}</table>
    </div>
  );
}

export const thClass = "border-b border-line bg-surface px-3 py-2.5 text-sm font-medium whitespace-nowrap text-muted";
export const tdClass = "border-b border-line px-3 py-3 align-middle group-last:border-b-0";
export const rowClass = "group transition-colors hover:bg-surface";

export function RoleBadge({ role }: { role: Role }) {
  if (role === "user") return <span className="text-muted">{roleLabels.user}</span>;
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-ink px-2.5 text-xs font-medium text-ink">
      {roleLabels[role]}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-line px-4 py-12 text-center text-muted">{children}</p>;
}

// "1–50 / 312" and links to the pages around the current one.
export function Pagination({
  path,
  params,
  page,
  pageSize,
  total,
}: {
  path: string;
  params: SearchParams;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const shown = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const href = (n: number) => withParam(path, params, "page", n === 1 ? "" : String(n));

  return (
    <nav aria-label="გვერდები" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted tabular-nums">
        {first}–{last} / {total}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <PageLink href={page > 1 ? href(page - 1) : undefined} label="წინა">
            <path d="m15 18-6-6 6-6" />
          </PageLink>
          {shown.map((n, index) => (
            <span key={n} className="flex items-center gap-1">
              {index > 0 && n - shown[index - 1] > 1 && <span className="px-1 text-muted">…</span>}
              <Link
                href={href(n)}
                aria-current={n === page ? "page" : undefined}
                className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 tabular-nums transition-colors ${
                  n === page ? "bg-ink text-white" : "text-ink hover:bg-surface"
                }`}
              >
                {n}
              </Link>
            </span>
          ))}
          <PageLink href={page < pages ? href(page + 1) : undefined} label="შემდეგი">
            <path d="m9 18 6-6-6-6" />
          </PageLink>
        </div>
      )}
    </nav>
  );
}

function PageLink({ href, label, children }: { href?: string; label: string; children: ReactNode }) {
  const icon = (
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
      {children}
    </svg>
  );
  if (!href) {
    return (
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg text-muted opacity-40">
        {icon}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-8 place-items-center rounded-lg text-ink transition-colors hover:bg-surface"
    >
      {icon}
    </Link>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

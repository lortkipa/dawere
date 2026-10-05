import Link from "next/link";
import { FilterBar } from "@/components/admin/filter-bar";
import { Empty, PageTitle, Pagination } from "@/components/admin/ui";
import { Avatar } from "@/components/avatar";
import { requireAdmin } from "@/lib/admin";
import { scopeLabels } from "@/lib/admin-content";
import { adminPageSize, withParam, type SearchParams } from "@/lib/admin-list";
import { kindLabels, listReportGroups, reportFilters, type ReportGroup } from "@/lib/admin-reports";
import { reasonLabel } from "@/lib/report-rules";
import { avatarUrl, formatShortDate } from "@/lib/user-view";

const path = "/admin/reports";

export default async function AdminReports({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const filters = reportFilters(params);
  const [{ rows, total }, labels] = await Promise.all([listReportGroups(filters), scopeLabels(filters.author, "")]);
  const filtered = Boolean(filters.q || filters.kind || filters.author);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="ჩივილები" count={total}>
        <nav aria-label="სტატუსი" className="flex rounded-lg border border-line p-0.5">
          {(["open", "closed"] as const).map((value) => (
            <Link
              key={value}
              href={withParam(path, params, "status", value === "open" ? "" : value)}
              aria-current={value === filters.status ? "page" : undefined}
              scroll={false}
              className={`rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
                value === filters.status ? "bg-ink text-bg" : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {value === "open" ? "ღია" : "დახურული"}
            </Link>
          ))}
        </nav>
      </PageTitle>

      <FilterBar
        path={path}
        values={{
          q: filters.q,
          status: filters.status === "open" ? "" : filters.status,
          kind: filters.kind,
          author: filters.author,
          sort: filters.sort,
        }}
        searchLabel="ტექსტი, სახელი, დეტალები"
        scopes={labels.author ? [{ name: "author", label: `ავტორი: ${labels.author}` }] : []}
        filters={[
          {
            name: "kind",
            label: "რაზე",
            options: [
              { value: "post", label: kindLabels.post },
              { value: "comment", label: kindLabels.comment },
              { value: "user", label: kindLabels.user },
            ],
          },
        ]}
        sorts={[
          { value: "new", label: "ჯერ ახალი" },
          { value: "most", label: "მეტი ჩივილი" },
        ]}
      />

      {rows.length === 0 ? (
        <Empty>
          {filtered
            ? "ასეთი ჩივილი არ მოიძებნა"
            : filters.status === "open"
              ? "ღია ჩივილები არ არის"
              : "დახურული ჩივილები არ არის"}
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {rows.map((row) => (
            <li key={`${row.kind}-${row.id}`}>
              <ReportRow row={row} closed={filters.status === "closed"} />
            </li>
          ))}
        </ul>
      )}

      <Pagination path={path} params={params} page={filters.page} pageSize={adminPageSize} total={total} />
    </div>
  );
}

const statusLabels: Record<string, string> = { dismissed: "უარყოფილი", actioned: "მომხმარებელი დაიბლოკა" };

function ReportRow({ row, closed }: { row: ReportGroup; closed: boolean }) {
  return (
    <Link
      href={`${path}/${row.kind}/${row.id}`}
      className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface"
    >
      <Avatar src={avatarUrl(row.author?.avatar ?? null)} className="size-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium">{kindLabels[row.kind]}</span>
          {row.author && <span className="text-muted">{row.author.name || `@${row.author.handle}`}</span>}
          <span className="text-muted">· {formatShortDate(row.latest)}</span>
        </div>
        <p
          className={`mt-1 line-clamp-2 text-[15px] break-words ${row.kind === "post" ? "font-medium" : ""} ${
            row.kind === "comment" ? "whitespace-pre-line" : ""
          }`}
        >
          {row.text}
        </p>
        {row.context && <p className="mt-1 truncate text-sm text-muted">{row.context}</p>}
        <p className="mt-1.5 text-sm text-muted">
          {row.reasons.map(reasonLabel).join(", ")}
          {closed && ` · ${row.statuses.map((status) => statusLabels[status] ?? status).join(", ")}`}
        </p>
      </div>
      <span
        className={`shrink-0 self-start rounded-full px-2.5 py-0.5 text-sm font-medium tabular-nums ${
          closed ? "bg-surface text-muted" : "bg-danger-soft text-danger"
        }`}
      >
        {row.count}
      </span>
    </Link>
  );
}

import Link from "next/link";
import { BackLink } from "@/components/admin/back-link";
import { BanEmailButton, UnbanButton } from "@/components/admin/ban-list";
import { Empty, PageTitle, Pagination } from "@/components/admin/ui";
import { Avatar } from "@/components/avatar";
import { requireAdmin } from "@/lib/admin";
import { adminPageSize, pageParam, type SearchParams } from "@/lib/admin-list";
import { listBans } from "@/lib/bans";
import { canRemove } from "@/lib/roles";
import { avatarUrl, formatShortDate } from "@/lib/user-view";

const path = "/admin/users/bans";

// Every banned address, including ones whose account was deleted and ones banned before signing up.
export default async function AdminBans({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const page = pageParam(params);
  const { rows, total } = await listBans(page, adminPageSize);

  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/admin/users">მომხმარებლები</BackLink>
      <PageTitle title="დაბლოკილები" count={total}>
        <BanEmailButton />
      </PageTitle>

      {rows.length === 0 ? (
        <Empty>დაბლოკილი ელფოსტები არ არის</Empty>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {rows.map((row) => {
            const hasAccount = row.accountId !== null;
            // The account's email isn't needed beyond the role: it is the banned address itself.
            const canUnban = !row.accountRole || canRemove(actor, { role: row.accountRole, email: row.email });
            return (
              <li key={row.email} className="flex items-start gap-3 px-4 py-3.5">
                <Avatar src={avatarUrl(row.accountAvatar)} className="size-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    {hasAccount ? (
                      <>
                        <Link href={`/admin/users/${row.accountId}`} className="font-medium hover:underline">
                          {row.accountName || `@${row.accountHandle}`}
                        </Link>
                        <span className="min-w-0 break-all text-sm text-muted">{row.email}</span>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 font-medium break-all">{row.email}</span>
                        <span className="text-sm text-muted">ანგარიში არ არის</span>
                      </>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatShortDate(row.createdAt)}
                    {row.byHandle && ` · დაბლოკა ${row.byName || `@${row.byHandle}`}`}
                  </p>
                  {row.reason && <p className="mt-1 text-[15px] break-words whitespace-pre-line">{row.reason}</p>}
                </div>
                {canUnban && <UnbanButton email={row.email} hasAccount={hasAccount} />}
              </li>
            );
          })}
        </ul>
      )}

      <Pagination path={path} params={params} page={page} pageSize={adminPageSize} total={total} />
    </div>
  );
}

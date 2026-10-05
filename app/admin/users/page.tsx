import Link from "next/link";
import { CreateUserButton } from "@/components/admin/create-user";
import { FilterBar } from "@/components/admin/filter-bar";
import { Empty, PageTitle, Pagination, RoleBadge, Table, rowClass, tdClass, thClass } from "@/components/admin/ui";
import { Avatar } from "@/components/avatar";
import { requireAdmin } from "@/lib/admin";
import { adminPageSize, type SearchParams } from "@/lib/admin-list";
import { listUsers, userFilters } from "@/lib/admin-users";
import { isSuperadmin, roleLabels } from "@/lib/roles";
import { avatarUrl, formatShortDate } from "@/lib/user-view";

const path = "/admin/users";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const filters = userFilters(params);
  const { rows, total } = await listUsers(filters);
  const filtered = Object.values(params).some(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="მომხმარებლები" count={total}>
        <CreateUserButton canCreateAdmin={isSuperadmin(actor)} />
      </PageTitle>

      <FilterBar
        path={path}
        values={{
          q: filters.q,
          role: filters.role,
          status: filters.status,
          posts: filters.posts,
          from: filters.from,
          to: filters.to,
          sort: filters.sort,
        }}
        searchLabel="სახელი, ელფოსტა, @სახელი"
        filters={[
          {
            name: "role",
            label: "როლი",
            options: [
              { value: "user", label: roleLabels.user },
              { value: "admin", label: roleLabels.admin },
              { value: "superadmin", label: roleLabels.superadmin },
            ],
          },
          {
            name: "status",
            label: "რეგისტრაცია",
            options: [
              { value: "onboarded", label: "დასრულებული" },
              { value: "pending", label: "დაუსრულებელი" },
            ],
          },
          {
            name: "posts",
            label: "ბლოგები",
            options: [
              { value: "with", label: "აქვს" },
              { value: "without", label: "არ აქვს" },
            ],
          },
        ]}
        dateRange="რეგისტრაციის თარიღი"
        sorts={[
          { value: "new", label: "ჯერ ახალი" },
          { value: "old", label: "ჯერ ძველი" },
          { value: "posts", label: "მეტი ბლოგი" },
          { value: "comments", label: "მეტი კომენტარი" },
          { value: "followers", label: "მეტი გამომწერი" },
        ]}
      />

      {rows.length === 0 ? (
        <Empty>{filtered ? "ასეთი მომხმარებელი არ მოიძებნა" : "მომხმარებლები ჯერ არ არის"}</Empty>
      ) : (
        <>
          {/* Phones get cards; the table needs more width than they have. */}
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line sm:hidden">
            {rows.map((user) => (
              <li key={user.id}>
                <Link
                  href={`${path}/${user.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-surface"
                >
                  <Avatar src={avatarUrl(user.avatar)} className="size-10" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{user.name || "უსახელო"}</span>
                      {user.role !== "user" && <RoleBadge role={user.role} />}
                    </span>
                    <span className="block truncate text-sm text-muted">{user.email}</span>
                    <span className="block text-sm text-muted tabular-nums">
                      {user.posts} ბლოგი · {user.comments} კომენტარი · {user.followers} გამომწერი
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
            <Table>
              <thead>
                <tr>
                  <th className={thClass}>მომხმარებელი</th>
                  <th className={thClass}>ელფოსტა</th>
                  <th className={thClass}>როლი</th>
                  <th className={`${thClass} text-right`}>ბლოგი</th>
                  <th className={`${thClass} text-right`}>კომენტარი</th>
                  <th className={`${thClass} text-right`}>გამომწერი</th>
                  <th className={thClass}>რეგისტრაცია</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id} className={rowClass}>
                    <td className={tdClass}>
                      <Link href={`${path}/${user.id}`} className="flex items-center gap-3 rounded-md">
                        <Avatar src={avatarUrl(user.avatar)} className="size-9" />
                        <span className="min-w-0">
                          <span className="block max-w-56 truncate font-medium text-ink">{user.name || "უსახელო"}</span>
                          <span className="block max-w-56 truncate text-sm text-muted">
                            @{user.handle}
                            {!user.onboardedAt && " · დაუსრულებელი"}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${tdClass} text-muted`}>
                      <span className="block max-w-60 truncate">{user.email}</span>
                    </td>
                    <td className={tdClass}>
                      <RoleBadge role={user.role} />
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{user.posts}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{user.comments}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{user.followers}</td>
                    <td className={`${tdClass} whitespace-nowrap text-muted`}>{formatShortDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}

      <Pagination path={path} params={params} page={filters.page} pageSize={adminPageSize} total={total} />
    </div>
  );
}

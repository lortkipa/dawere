import Link from "next/link";
import { NewPostButton } from "@/components/admin/new-post";
import { FilterBar } from "@/components/admin/filter-bar";
import { Empty, PageTitle, Pagination, Table, rowClass, tdClass, thClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { getCategories } from "@/lib/categories";
import { listPosts, postFilters, scopeLabels } from "@/lib/admin-content";
import { adminPageSize, type SearchParams } from "@/lib/admin-list";
import { tagView } from "@/lib/tags";
import { formatShortDate, imageUrl } from "@/lib/user-view";

const path = "/admin/blogs";

export default async function AdminBlogs({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const categories = await getCategories();
  const filters = postFilters(params, categories);
  const [{ rows, total }, labels] = await Promise.all([listPosts(filters), scopeLabels(filters.author, "")]);
  const filtered = Object.values(params).some(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="ბლოგები" count={total}>
        <NewPostButton />
      </PageTitle>

      <FilterBar
        path={path}
        values={{
          q: filters.q,
          author: filters.author,
          tag: filters.tag,
          cover: filters.cover,
          from: filters.from,
          to: filters.to,
          sort: filters.sort,
        }}
        searchLabel="სათაური, აღწერა ან ავტორი"
        scopes={labels.author ? [{ name: "author", label: `ავტორი: ${labels.author}` }] : []}
        filters={[
          {
            name: "tag",
            label: "თემა",
            options: categories.map((category) => ({
              value: category.slug,
              label: `${category.emoji} ${category.label}`,
            })),
          },
          {
            name: "cover",
            label: "მთავარი ფოტო",
            options: [
              { value: "with", label: "აქვს" },
              { value: "without", label: "არ აქვს" },
            ],
          },
        ]}
        dateRange="გამოქვეყნების თარიღი"
        sorts={[
          { value: "new", label: "ჯერ ახალი" },
          { value: "old", label: "ჯერ ძველი" },
          { value: "opens", label: "მეტი წაკითხვა" },
          { value: "likes", label: "მეტი მოწონება" },
          { value: "comments", label: "მეტი კომენტარი" },
        ]}
      />

      {rows.length === 0 ? (
        <Empty>{filtered ? "ასეთი ბლოგი არ მოიძებნა" : "ბლოგები ჯერ არ არის"}</Empty>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line sm:hidden">
            {rows.map((post) => (
              <li key={post.id}>
                <Link
                  href={`${path}/${post.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-surface"
                >
                  <Cover name={post.cover} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-medium">{post.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {post.authorName || `@${post.authorHandle}`} · {formatShortDate(post.createdAt)}
                    </span>
                    <span className="block text-sm text-muted tabular-nums">
                      {post.opens} წაკითხვა · {post.likes} მოწონება · {post.comments} კომენტარი
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
                  <th className={thClass}>ბლოგი</th>
                  <th className={thClass}>ავტორი</th>
                  <th className={thClass}>თემები</th>
                  <th className={`${thClass} text-right`}>წაკითხვა</th>
                  <th className={`${thClass} text-right`}>მოწონება</th>
                  <th className={`${thClass} text-right`}>კომენტარი</th>
                  <th className={thClass}>თარიღი</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((post) => (
                  <tr key={post.id} className={rowClass}>
                    <td className={tdClass}>
                      <Link href={`${path}/${post.id}`} className="flex items-center gap-3 rounded-md">
                        <Cover name={post.cover} />
                        <span className="line-clamp-2 max-w-72 font-medium text-ink">{post.title}</span>
                      </Link>
                    </td>
                    <td className={tdClass}>
                      <Link
                        href={`/admin/users/${post.authorId}`}
                        className="block max-w-40 truncate text-muted hover:text-ink hover:underline"
                      >
                        {post.authorName || `@${post.authorHandle}`}
                      </Link>
                    </td>
                    <td className={`${tdClass} text-sm text-muted`}>
                      <span className="line-clamp-2 max-w-52">
                        {post.tags
                          .map((tag) => {
                            const view = tagView(tag, categories);
                            return view.emoji ? view.label : `#${view.label}`;
                          })
                          .join(", ")}
                      </span>
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{post.opens}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{post.likes}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{post.comments}</td>
                    <td className={`${tdClass} whitespace-nowrap text-muted`}>{formatShortDate(post.createdAt)}</td>
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

function Cover({ name }: { name: string | null }) {
  if (!name) return <span aria-hidden="true" className="h-10 w-16 shrink-0 rounded-md bg-surface" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageUrl(name)} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />;
}

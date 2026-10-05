import { CommentList } from "@/components/admin/comment-list";
import { FilterBar } from "@/components/admin/filter-bar";
import { Empty, PageTitle, Pagination } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { commentFilters, commentRows, listComments, scopeLabels } from "@/lib/admin-content";
import { adminPageSize, type SearchParams } from "@/lib/admin-list";

const path = "/admin/comments";

export default async function AdminComments({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const actor = await requireAdmin();
  const params = await searchParams;
  const filters = commentFilters(params);
  const [{ rows, total }, labels] = await Promise.all([
    listComments(filters),
    scopeLabels(filters.author, filters.post),
  ]);
  const filtered = Object.values(params).some(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="კომენტარები" count={total} />

      <FilterBar
        path={path}
        values={{
          q: filters.q,
          author: filters.author,
          post: filters.post,
          kind: filters.kind,
          from: filters.from,
          to: filters.to,
          sort: filters.sort,
        }}
        searchLabel="კომენტარის ტექსტი"
        scopes={[
          ...(labels.author ? [{ name: "author", label: `ავტორი: ${labels.author}` }] : []),
          ...(labels.post ? [{ name: "post", label: `ბლოგი: ${labels.post}` }] : []),
        ]}
        filters={[
          {
            name: "kind",
            label: "ტიპი",
            options: [
              { value: "top", label: "კომენტარი" },
              { value: "reply", label: "პასუხი" },
            ],
          },
        ]}
        dateRange="თარიღი"
        sorts={[
          { value: "new", label: "ჯერ ახალი" },
          { value: "old", label: "ჯერ ძველი" },
          { value: "likes", label: "მეტი მოწონება" },
        ]}
      />

      {rows.length === 0 ? (
        <Empty>{filtered ? "ასეთი კომენტარი არ მოიძებნა" : "კომენტარები ჯერ არ არის"}</Empty>
      ) : (
        <CommentList comments={commentRows(rows, actor)} />
      )}

      <Pagination path={path} params={params} page={filters.page} pageSize={adminPageSize} total={total} />
    </div>
  );
}

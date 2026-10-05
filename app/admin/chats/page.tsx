import { ChatList } from "@/components/admin/chat-list";
import { FilterBar } from "@/components/admin/filter-bar";
import { Empty, PageTitle, Pagination } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { chatFilters, listChats } from "@/lib/admin-chats";
import { scopeLabels } from "@/lib/admin-content";
import { adminPageSize, withParam, type SearchParams } from "@/lib/admin-list";

const path = "/admin/chats";

export default async function AdminChats({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const filters = chatFilters(params);
  const [{ rows, total }, labels] = await Promise.all([listChats(filters), scopeLabels(filters.user, filters.post)]);
  const filtered = Object.values(params).some(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="AI ჩატები" count={total} />

      <FilterBar
        path={path}
        values={{
          q: filters.q,
          user: filters.user,
          post: filters.post,
          answer: filters.answer,
          from: filters.from,
          to: filters.to,
          sort: filters.sort,
        }}
        searchLabel="შეკითხვა, პასუხი, მკითხველი ან ბლოგი"
        scopes={[
          ...(labels.author ? [{ name: "user", label: `მკითხველი: ${labels.author}` }] : []),
          ...(labels.post ? [{ name: "post", label: `ბლოგი: ${labels.post}` }] : []),
        ]}
        filters={[
          {
            name: "answer",
            label: "პასუხები",
            options: [{ value: "failed", label: "შეწყვეტილი პასუხით" }],
          },
        ]}
        dateRange="დაწყების თარიღი"
        sorts={[
          { value: "new", label: "ჯერ ახალი" },
          { value: "old", label: "ჯერ ძველი" },
          { value: "questions", label: "მეტი შეკითხვა" },
        ]}
      />

      {rows.length === 0 ? (
        <Empty>{filtered ? "ასეთი ჩატი არ მოიძებნა" : "AI ჩატები ჯერ არ არის"}</Empty>
      ) : (
        <ChatList chats={rows} filterHref={(name, value) => withParam(path, params, name, value)} />
      )}

      <Pagination path={path} params={params} page={filters.page} pageSize={adminPageSize} total={total} />
    </div>
  );
}

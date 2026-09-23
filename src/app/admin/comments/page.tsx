import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, sql, type SQL } from 'drizzle-orm';
import { MessageSquare, X } from 'lucide-react';
import { db } from '@/db';
import { posts, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { PAGE_SIZE, likePattern, listHref, pick, readParams, omit } from '@/lib/admin';
import { AdminMain } from '@/components/admin/bits';
import { ListControls } from '@/components/admin/controls';
import { CommentsTable, type CommentRow } from '@/components/admin/comments-table';
import { Pagination } from '@/components/feed-tabs';
import { EmptyState, PageHeader } from '@/components/ui';
import { formatDate, isUuid, pageParam } from '@/lib/utils';

export const metadata: Metadata = { title: 'კომენტარები' };

const KINDS = ['', 'top', 'replies'] as const;
const SORTS = ['new', 'old'] as const;

type Row = {
  id: string;
  body: string;
  parent_id: string | null;
  replies: number;
  created_at: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  post_id: string;
  post_title: string;
  post_slug: string;
  post_status: string;
  total: number;
};

/** A removable "scoped to …" chip above the list. */
function ScopeChip({ label, name, href, clearHref }: { label: string; name: string; href: string; clearHref: string }) {
  return (
    <p className="mr-2 mb-3 inline-flex items-center gap-1 rounded-full border border-line bg-sunken py-1 pr-1 pl-3 text-[13px] text-muted">
      {label}:{' '}
      <Link href={href} className="max-w-64 truncate font-medium text-ink hover:underline">
        {name}
      </Link>
      <Link
        href={clearHref}
        aria-label="ფილტრის მოხსნა"
        className="ml-1 flex size-6 items-center justify-center rounded-full text-subtle hover:bg-hover hover:text-ink"
      >
        <X className="size-3.5" />
      </Link>
    </p>
  );
}

export default async function AdminCommentsPage(props: PageProps<'/admin/comments'>) {
  await requireAdmin('/admin/comments');
  const params = readParams(await props.searchParams);
  const q = params.q ?? '';
  const kind = pick(params.kind, KINDS);
  const sort = pick(params.sort, SORTS);
  const postId = isUuid(params.post) ? params.post : '';
  const authorId = isUuid(params.author) ? params.author : '';
  const page = pageParam(params.page);

  const where: SQL[] = [sql`true`];
  if (q) {
    const pattern = likePattern(q.replace(/^@/, ''));
    where.push(sql`(c.body ilike ${pattern} or u.name ilike ${pattern} or u.username ilike ${pattern})`);
  }
  if (kind === 'top') where.push(sql`c.parent_id is null`);
  if (kind === 'replies') where.push(sql`c.parent_id is not null`);
  if (postId) where.push(sql`c.post_id = ${postId}::uuid`);
  if (authorId) where.push(sql`c.author_id = ${authorId}::uuid`);

  const [rows, scopedPost, scopedAuthor] = await Promise.all([
    db.execute<Row>(sql`
      select c.id, c.body, c.parent_id, c.created_at,
        (select count(*)::int from comments r where r.parent_id = c.id) as replies,
        u.id as author_id, u.name as author_name, u.username as author_username, u.avatar_url as author_avatar,
        p.id as post_id, p.title as post_title, p.slug as post_slug, p.status as post_status,
        count(*) over ()::int as total
      from comments c
      join users u on u.id = c.author_id
      join posts p on p.id = c.post_id
      where ${sql.join(where, sql` and `)}
      order by c.created_at ${sort === 'old' ? sql`asc` : sql`desc`}
      limit ${PAGE_SIZE + 1} offset ${(page - 1) * PAGE_SIZE}
    `),
    postId ? db.select({ title: posts.title }).from(posts).where(eq(posts.id, postId)).limit(1) : Promise.resolve([]),
    authorId ? db.select({ name: users.name }).from(users).where(eq(users.id, authorId)).limit(1) : Promise.resolve([]),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const total = rows[0]?.total ?? 0;
  const tableRows: CommentRow[] = rows.slice(0, PAGE_SIZE).map((row) => ({
    id: row.id,
    body: row.body,
    isReply: Boolean(row.parent_id),
    replies: row.replies,
    author: { id: row.author_id, name: row.author_name, username: row.author_username, avatarUrl: row.author_avatar },
    post: { id: row.post_id, title: row.post_title, slug: row.post_slug, published: row.post_status === 'published' },
    date: formatDate(row.created_at),
  }));

  const values = omit(params, 'page', 'q');
  const withoutPost = omit(params, 'post');
  const withoutAuthor = omit(params, 'author');
  const filtered = Boolean(q || kind || postId || authorId);

  return (
    <AdminMain>
      <PageHeader title="კომენტარები" description={filtered ? `ნაპოვნია ${total}` : `სულ ${total}`} />

      {postId || authorId ? (
        <div>
          {postId ? (
            <ScopeChip
              label="სტატია"
              name={scopedPost[0]?.title || 'უსათაურო'}
              href={`/admin/posts/${postId}`}
              clearHref={listHref('/admin/comments', withoutPost)}
            />
          ) : null}
          {authorId ? (
            <ScopeChip
              label="ავტორი"
              name={scopedAuthor[0]?.name ?? 'უცნობი'}
              href={`/admin/users/${authorId}`}
              clearHref={listHref('/admin/comments', withoutAuthor)}
            />
          ) : null}
        </div>
      ) : null}

      <ListControls
        placeholder="ტექსტი ან ავტორი"
        q={q}
        values={values}
        filters={[
          {
            name: 'kind',
            label: 'ტიპი',
            options: [
              { value: '', label: 'ყველა კომენტარი' },
              { value: 'top', label: 'მხოლოდ კომენტარები' },
              { value: 'replies', label: 'მხოლოდ პასუხები' },
            ],
          },
          {
            name: 'sort',
            label: 'დალაგება',
            options: [
              { value: '', label: 'ახლები ჯერ' },
              { value: 'old', label: 'ძველები ჯერ' },
            ],
          },
        ]}
      />

      {tableRows.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title={filtered ? 'ვერაფერი მოიძებნა' : 'კომენტარები ჯერ არ არის'}
          description={filtered ? 'სცადე სხვა სიტყვა ან მოხსენი ფილტრები.' : undefined}
        />
      ) : (
        <CommentsTable rows={tableRows} />
      )}

      <div className="mt-6">
        <Pagination
          basePath={listHref('/admin/comments', params)}
          page={page}
          hasMore={hasMore}
          labels={{ prev: 'წინა', next: 'შემდეგი' }}
        />
      </div>
    </AdminMain>
  );
}

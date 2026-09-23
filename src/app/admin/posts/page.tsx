import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, sql, type SQL } from 'drizzle-orm';
import { FileText, X } from 'lucide-react';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { PAGE_SIZE, likePattern, listHref, pick, readParams, omit } from '@/lib/admin';
import { AdminMain } from '@/components/admin/bits';
import { ListControls } from '@/components/admin/controls';
import { PostsTable, type PostRow } from '@/components/admin/posts-table';
import { Pagination } from '@/components/feed-tabs';
import { EmptyState, PageHeader } from '@/components/ui';
import { formatDate, isUuid, pageParam } from '@/lib/utils';

export const metadata: Metadata = { title: 'სტატიები' };

const STATUS = ['', 'published', 'draft', 'pending'] as const;
const SORTS = ['new', 'old', 'updated', 'views', 'likes', 'comments'] as const;

const ORDER: Record<(typeof SORTS)[number], SQL> = {
  new: sql`coalesce(p.published_at, p.created_at) desc`,
  old: sql`coalesce(p.published_at, p.created_at) asc`,
  updated: sql`p.updated_at desc`,
  views: sql`p.view_count desc, p.published_at desc nulls last`,
  likes: sql`p.like_count desc, p.published_at desc nulls last`,
  comments: sql`p.comment_count desc, p.published_at desc nulls last`,
};

type Row = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  has_pending: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string | null;
  updated_at: string;
  author_id: string;
  author_name: string;
  author_username: string;
  total: number;
};

export default async function AdminPostsPage(props: PageProps<'/admin/posts'>) {
  await requireAdmin('/admin/posts');
  const params = readParams(await props.searchParams);
  const q = params.q ?? '';
  const status = pick(params.status, STATUS);
  const sort = pick(params.sort, SORTS);
  const topic = params.topic ?? '';
  const authorId = isUuid(params.author) ? params.author : '';
  const page = pageParam(params.page);

  const where: SQL[] = [sql`true`];
  if (q) {
    const pattern = likePattern(q.replace(/^@/, ''));
    where.push(
      sql`(p.title ilike ${pattern} or p.subtitle ilike ${pattern} or u.name ilike ${pattern} or u.username ilike ${pattern})`,
    );
  }
  if (status === 'published' || status === 'draft') where.push(sql`p.status = ${status}`);
  if (status === 'pending') where.push(sql`p.pending_revision is not null`);
  if (authorId) where.push(sql`p.author_id = ${authorId}::uuid`);
  if (topic) {
    where.push(sql`exists (
      select 1 from post_topics pt join topics t on t.id = pt.topic_id
      where pt.post_id = p.id and t.slug = ${topic}
    )`);
  }

  const [rows, topicOptions, author] = await Promise.all([
    db.execute<Row>(sql`
      select p.id, p.title, p.slug, p.status, (p.pending_revision is not null) as has_pending,
        p.view_count, p.like_count, p.comment_count, p.published_at, p.updated_at,
        u.id as author_id, u.name as author_name, u.username as author_username,
        count(*) over ()::int as total
      from posts p
      join users u on u.id = p.author_id
      where ${sql.join(where, sql` and `)}
      order by ${ORDER[sort]}
      limit ${PAGE_SIZE + 1} offset ${(page - 1) * PAGE_SIZE}
    `),
    // Topics that tag at least one post, drafts included; the busiest first.
    db.execute<{ slug: string; name: string; n: number }>(sql`
      select t.slug, t.name, count(pt.post_id)::int as n
      from topics t join post_topics pt on pt.topic_id = t.id
      group by t.id
      order by n desc, t.name
      limit 60
    `),
    authorId
      ? db.select({ name: users.name }).from(users).where(eq(users.id, authorId)).limit(1)
      : Promise.resolve([]),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const total = rows[0]?.total ?? 0;
  const tableRows: PostRow[] = rows.slice(0, PAGE_SIZE).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    published: row.status === 'published',
    hasPending: row.has_pending,
    author: { id: row.author_id, name: row.author_name, username: row.author_username },
    views: row.view_count,
    likes: row.like_count,
    comments: row.comment_count,
    date: formatDate(row.status === 'published' ? row.published_at : row.updated_at),
  }));

  const values = omit(params, 'page', 'q');
  const filtered = Boolean(q || status || topic || authorId);
  const withoutAuthor = omit(params, 'author');

  return (
    <AdminMain>
      <PageHeader title="სტატიები" description={filtered ? `ნაპოვნია ${total}` : `სულ ${total}`} />

      {authorId ? (
        <p className="mb-3 inline-flex items-center gap-1 rounded-full border border-line bg-sunken py-1 pr-1 pl-3 text-[13px] text-muted">
          ავტორი:{' '}
          <Link href={`/admin/users/${authorId}`} className="font-medium text-ink hover:underline">
            {author[0]?.name ?? 'უცნობი'}
          </Link>
          <Link
            href={listHref('/admin/posts', withoutAuthor)}
            aria-label="ავტორის ფილტრის მოხსნა"
            className="ml-1 flex size-6 items-center justify-center rounded-full text-subtle hover:bg-hover hover:text-ink"
          >
            <X className="size-3.5" />
          </Link>
        </p>
      ) : null}

      <ListControls
        placeholder="სათაური ან ავტორი"
        q={q}
        values={values}
        filters={[
          {
            name: 'status',
            label: 'სტატუსი',
            options: [
              { value: '', label: 'ყველა სტატუსი' },
              { value: 'published', label: 'გამოქვეყნებული' },
              { value: 'draft', label: 'მონახაზი' },
              { value: 'pending', label: 'გამოუქვეყნებელი ცვლილებებით' },
            ],
          },
          {
            name: 'topic',
            label: 'თემა',
            options: [
              { value: '', label: 'ყველა თემა' },
              ...topicOptions.map((t) => ({ value: t.slug, label: `${t.name} (${t.n})` })),
            ],
          },
          {
            name: 'sort',
            label: 'დალაგება',
            options: [
              { value: '', label: 'ახლები ჯერ' },
              { value: 'old', label: 'ძველები ჯერ' },
              { value: 'updated', label: 'ბოლოს შეცვლილი' },
              { value: 'views', label: 'ყველაზე ნახვადი' },
              { value: 'likes', label: 'ყველაზე მოწონებული' },
              { value: 'comments', label: 'ყველაზე განხილული' },
            ],
          },
        ]}
      />

      {tableRows.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title={filtered ? 'ვერაფერი მოიძებნა' : 'სტატიები ჯერ არ არის'}
          description={filtered ? 'სცადე სხვა სიტყვა ან მოხსენი ფილტრები.' : undefined}
        />
      ) : (
        <PostsTable rows={tableRows} />
      )}

      <div className="mt-6">
        <Pagination
          basePath={listHref('/admin/posts', params)}
          page={page}
          hasMore={hasMore}
          labels={{ prev: 'წინა', next: 'შემდეგი' }}
        />
      </div>
    </AdminMain>
  );
}

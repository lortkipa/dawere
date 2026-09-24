import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, sql, type SQL } from 'drizzle-orm';
import { X } from 'lucide-react';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { PAGE_SIZE, likePattern, listHref, omit, pick, readParams } from '@/lib/admin';
import { AdminMain } from '@/components/admin/bits';
import { ListControls } from '@/components/admin/controls';
import { ReportsTable, type ReportGroup } from '@/components/admin/reports-table';
import { Pagination } from '@/components/feed-tabs';
import { EmptyState, PageHeader } from '@/components/ui';
import { isUuid, pageParam } from '@/lib/utils';

export const metadata: Metadata = { title: 'საჩივრები' };

const STATUSES = ['', 'closed', 'all'] as const;
const TYPES = ['', 'post', 'comment', 'user'] as const;
const SORTS = ['', 'most', 'old'] as const;

type Row = {
  target_type: 'post' | 'comment' | 'user';
  target_id: string;
  reports: number;
  open: number;
  last_at: string;
  label: string;
  excerpt: string;
  status: 'open' | 'resolved' | 'dismissed';
  items: {
    id: string;
    reason: string;
    details: string;
    status: 'open' | 'resolved' | 'dismissed';
    created_at: string;
    resolved_at: string | null;
    reporter_id: string | null;
    reporter_name: string | null;
    reporter_username: string | null;
    resolver_name: string | null;
  }[];
  owner_id: string | null;
  owner_name: string | null;
  owner_username: string | null;
  owner_avatar: string | null;
  live: Record<string, unknown> | null;
  total: number;
};

export default async function AdminReportsPage(props: PageProps<'/admin/reports'>) {
  await requireAdmin('/admin/reports');
  const params = readParams(await props.searchParams);
  const q = params.q ?? '';
  const status = pick(params.status, STATUSES);
  const type = pick(params.type, TYPES);
  const sort = pick(params.sort, SORTS);
  const ownerId = isUuid(params.owner) ? params.owner : '';
  const page = pageParam(params.page);

  const where: SQL[] = [sql`true`];
  if (status === '') where.push(sql`r.status = 'open'`);
  if (status === 'closed') where.push(sql`r.status <> 'open'`);
  if (type) where.push(sql`r.target_type = ${type}`);
  if (ownerId) where.push(sql`r.target_owner_id = ${ownerId}::uuid`);
  if (q) {
    const pattern = likePattern(q.replace(/^@/, ''));
    where.push(sql`(r.target_label ilike ${pattern} or r.target_excerpt ilike ${pattern} or r.details ilike ${pattern})`);
  }

  const order =
    sort === 'most'
      ? sql`g.reports desc, g.last_at desc`
      : sort === 'old'
        ? sql`g.last_at asc`
        : sql`g.last_at desc`;

  const [rows, scopedOwner] = await Promise.all([
    db.execute<Row>(sql`
      with grouped as (
        select r.target_type, r.target_id,
          count(*)::int as reports,
          count(*) filter (where r.status = 'open')::int as open,
          max(r.created_at) as last_at,
          (array_agg(r.target_label order by r.created_at desc))[1] as label,
          (array_agg(r.target_excerpt order by r.created_at desc))[1] as excerpt,
          (array_agg(r.target_owner_id order by r.created_at desc))[1] as owner_id,
          (array_agg(r.status order by coalesce(r.resolved_at, r.created_at) desc))[1] as status,
          jsonb_agg(jsonb_build_object(
            'id', r.id, 'reason', r.reason, 'details', r.details, 'status', r.status,
            'created_at', r.created_at, 'resolved_at', r.resolved_at,
            'reporter_id', r.reporter_id, 'reporter_name', ru.name, 'reporter_username', ru.username,
            'resolver_name', au.name
          ) order by r.created_at desc) as items
        from reports r
        left join users ru on ru.id = r.reporter_id
        left join users au on au.id = r.resolved_by
        where ${sql.join(where, sql` and `)}
        group by r.target_type, r.target_id
      )
      select g.*, count(*) over ()::int as total,
        o.name as owner_name, o.username as owner_username, o.avatar_url as owner_avatar,
        case g.target_type
          when 'post' then (
            select jsonb_build_object('title', p.title, 'slug', p.slug, 'published', p.status = 'published')
            from posts p where p.id = g.target_id
          )
          when 'comment' then (
            select jsonb_build_object(
              'body', c.body, 'deleted', c.deleted_at is not null, 'postId', p.id, 'slug', p.slug,
              'postTitle', p.title, 'published', p.status = 'published'
            )
            from comments c join posts p on p.id = c.post_id where c.id = g.target_id
          )
          else (
            select jsonb_build_object('name', u.name, 'username', u.username, 'suspended', u.suspended_at is not null)
            from users u where u.id = g.target_id
          )
        end as live
      from grouped g
      left join users o on o.id = g.owner_id
      order by ${order}
      limit ${PAGE_SIZE + 1} offset ${(page - 1) * PAGE_SIZE}
    `),
    ownerId ? db.select({ name: users.name }).from(users).where(eq(users.id, ownerId)).limit(1) : Promise.resolve([]),
  ]);

  const hasMore = rows.length > PAGE_SIZE;
  const total = rows[0]?.total ?? 0;
  const groups: ReportGroup[] = rows.slice(0, PAGE_SIZE).map((row) => ({
    key: `${row.target_type}:${row.target_id}`,
    type: row.target_type,
    id: row.target_id,
    label: row.label,
    excerpt: row.excerpt,
    status: row.status,
    reports: row.reports,
    open: row.open,
    lastAt: row.last_at,
    owner: row.owner_id
      ? {
          id: row.owner_id,
          name: row.owner_name ?? 'წაშლილი ანგარიში',
          username: row.owner_username ?? '',
          avatarUrl: row.owner_avatar,
          exists: row.owner_name !== null,
        }
      : null,
    live: row.live as ReportGroup['live'],
    items: row.items.map((item) => ({
      id: item.id,
      reason: item.reason,
      details: item.details,
      status: item.status,
      createdAt: item.created_at,
      resolvedAt: item.resolved_at,
      reporter: item.reporter_id
        ? { id: item.reporter_id, name: item.reporter_name ?? '', username: item.reporter_username ?? '' }
        : null,
      resolverName: item.resolver_name,
    })),
  }));

  const values = omit(params, 'page', 'q');
  const filtered = Boolean(q || type || ownerId);
  const heading = status === '' ? 'განსახილველი' : status === 'closed' ? 'დახურული' : 'ყველა';

  return (
    <AdminMain>
      <PageHeader
        title="საჩივრები"
        description={`${heading}: ${total}`}
      />

      {ownerId ? (
        <p className="mb-3 inline-flex items-center gap-1 rounded-full border border-line bg-sunken py-1 pr-1 pl-3 text-[13px] text-muted">
          ავტორი:{' '}
          <Link href={`/admin/users/${ownerId}`} className="max-w-64 truncate font-medium text-ink hover:underline">
            {scopedOwner[0]?.name ?? 'უცნობი'}
          </Link>
          <Link
            href={listHref('/admin/reports', omit(params, 'owner'))}
            aria-label="ფილტრის მოხსნა"
            className="ml-1 flex size-6 items-center justify-center rounded-full text-subtle hover:bg-hover hover:text-ink"
          >
            <X className="size-3.5" />
          </Link>
        </p>
      ) : null}

      <ListControls
        placeholder="ტექსტი, სათაური ან ავტორი"
        q={q}
        values={values}
        filters={[
          {
            name: 'status',
            label: 'სტატუსი',
            options: [
              { value: '', label: 'განსახილველი' },
              { value: 'closed', label: 'დახურული' },
              { value: 'all', label: 'ყველა' },
            ],
          },
          {
            name: 'type',
            label: 'ტიპი',
            options: [
              { value: '', label: 'ყველაფერი' },
              { value: 'post', label: 'სტატიები' },
              { value: 'comment', label: 'კომენტარები' },
              { value: 'user', label: 'მომხმარებლები' },
            ],
          },
          {
            name: 'sort',
            label: 'დალაგება',
            options: [
              { value: '', label: 'ახლები ჯერ' },
              { value: 'most', label: 'ყველაზე ხშირად' },
              { value: 'old', label: 'ძველები ჯერ' },
            ],
          },
        ]}
      />

      {groups.length === 0 ? (
        <EmptyState
          title={filtered ? 'ვერაფერი მოიძებნა' : status === '' ? 'განსახილველი საჩივარი არ არის' : 'საჩივრები ჯერ არ არის'}
          description={
            filtered
              ? 'სცადე სხვა სიტყვა ან მოხსენი ფილტრები.'
              : status === ''
                ? 'როცა მკითხველი სტატიას, კომენტარს ან პროფილს დარღვევად მონიშნავს, აქ გამოჩნდება.'
                : undefined
          }
        />
      ) : (
        <ReportsTable groups={groups} />
      )}

      <div className="mt-6">
        <Pagination
          basePath={listHref('/admin/reports', params)}
          page={page}
          hasMore={hasMore}
          labels={{ prev: 'წინა', next: 'შემდეგი' }}
        />
      </div>
    </AdminMain>
  );
}

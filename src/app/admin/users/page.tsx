import type { Metadata } from 'next';
import { sql, type SQL } from 'drizzle-orm';
import { UserPlus } from 'lucide-react';
import { db } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { PAGE_SIZE, canManage, likePattern, listHref, pick, readParams, omit } from '@/lib/admin';
import { AdminMain } from '@/components/admin/bits';
import { ListControls } from '@/components/admin/controls';
import { UsersTable, type UserRow } from '@/components/admin/users-table';
import { Pagination } from '@/components/feed-tabs';
import { ButtonLink, EmptyState, PageHeader } from '@/components/ui';
import type { Access } from '@/db/schema';
import { formatDate, pageParam } from '@/lib/utils';

export const metadata: Metadata = { title: 'მომხმარებლები' };

const ACCESS = ['', 'user', 'admin'] as const;
const STATUS = ['', 'active', 'suspended'] as const;
const SORTS = ['new', 'old', 'name', 'posts', 'comments'] as const;

const ORDER: Record<(typeof SORTS)[number], SQL> = {
  new: sql`u.created_at desc`,
  old: sql`u.created_at asc`,
  name: sql`lower(u.name) asc`,
  posts: sql`published desc, u.created_at desc`,
  comments: sql`comments desc, u.created_at desc`,
};

type Row = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar_url: string | null;
  access: Access;
  suspended_at: string | null;
  suspended_reason: string;
  created_at: string;
  published: number;
  drafts: number;
  comments: number;
  total: number;
};

export default async function AdminUsersPage(props: PageProps<'/admin/users'>) {
  const actor = await requireAdmin('/admin/users');
  const params = readParams(await props.searchParams);
  const q = params.q ?? '';
  const access = pick(params.access, ACCESS);
  const status = pick(params.status, STATUS);
  const sort = pick(params.sort, SORTS);
  const page = pageParam(params.page);

  const where: SQL[] = [sql`true`];
  if (q) {
    const pattern = likePattern(q.replace(/^@/, ''));
    where.push(sql`(u.name ilike ${pattern} or u.username ilike ${pattern} or u.email ilike ${pattern})`);
  }
  if (access === 'user') where.push(sql`u.access = 'user'`);
  if (access === 'admin') where.push(sql`u.access <> 'user'`);
  if (status === 'active') where.push(sql`u.suspended_at is null`);
  if (status === 'suspended') where.push(sql`u.suspended_at is not null`);

  const rows = await db.execute<Row>(sql`
    select u.id, u.name, u.username, u.email, u.avatar_url, u.access, u.suspended_at, u.suspended_reason, u.created_at,
      (select count(*)::int from posts p where p.author_id = u.id and p.status = 'published') as published,
      (select count(*)::int from posts p where p.author_id = u.id and p.status = 'draft') as drafts,
      (select count(*)::int from comments c where c.author_id = u.id and c.deleted_at is null) as comments,
      count(*) over ()::int as total
    from users u
    where ${sql.join(where, sql` and `)}
    order by ${ORDER[sort]}
    limit ${PAGE_SIZE + 1} offset ${(page - 1) * PAGE_SIZE}
  `);

  const hasMore = rows.length > PAGE_SIZE;
  const total = rows[0]?.total ?? 0;
  const tableRows: UserRow[] = rows.slice(0, PAGE_SIZE).map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url,
    access: row.access,
    suspended: Boolean(row.suspended_at),
    suspendedReason: row.suspended_reason,
    joined: formatDate(row.created_at),
    published: row.published,
    drafts: row.drafts,
    comments: row.comments,
    manageable: canManage(actor, row),
  }));

  const values = omit(params, 'page', 'q');
  const filtered = Boolean(q || access || status);

  return (
    <AdminMain>
      <PageHeader
        title="მომხმარებლები"
        description={filtered ? `ნაპოვნია ${total}` : `სულ ${total}`}
        action={
          <ButtonLink href="/admin/users/new" size="sm">
            <UserPlus />
            ახალი ანგარიში
          </ButtonLink>
        }
      />

      <ListControls
        placeholder="სახელი, @მომხმარებელი ან ელფოსტა"
        q={q}
        values={values}
        filters={[
          {
            name: 'access',
            label: 'როლი',
            options: [
              { value: '', label: 'ყველა როლი' },
              { value: 'user', label: 'წევრები' },
              { value: 'admin', label: 'ადმინები' },
            ],
          },
          {
            name: 'status',
            label: 'სტატუსი',
            options: [
              { value: '', label: 'ნებისმიერი სტატუსი' },
              { value: 'active', label: 'აქტიური' },
              { value: 'suspended', label: 'შეჩერებული' },
            ],
          },
          {
            name: 'sort',
            label: 'დალაგება',
            options: [
              { value: '', label: 'ახლები ჯერ' },
              { value: 'old', label: 'ძველები ჯერ' },
              { value: 'name', label: 'სახელით' },
              { value: 'posts', label: 'ყველაზე მეტი სტატია' },
              { value: 'comments', label: 'ყველაზე მეტი კომენტარი' },
            ],
          },
        ]}
      />

      {tableRows.length === 0 ? (
        <EmptyState
          title={filtered ? 'ვერაფერი მოიძებნა' : 'მომხმარებლები ჯერ არ არიან'}
          description={filtered ? 'სცადე სხვა სიტყვა ან მოხსენი ფილტრები.' : undefined}
        />
      ) : (
        <UsersTable rows={tableRows} actorIsSuper={actor.access === 'super_admin'} />
      )}

      <div className="mt-6">
        <Pagination
          basePath={listHref('/admin/users', params)}
          page={page}
          hasMore={hasMore}
          labels={{ prev: 'წინა', next: 'შემდეგი' }}
        />
      </div>
    </AdminMain>
  );
}

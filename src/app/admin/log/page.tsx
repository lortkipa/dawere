import type { Metadata } from 'next';
import Link from 'next/link';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { PAGE_SIZE, actionLabel, likePattern, listHref, pick, readParams, omit } from '@/lib/admin';
import { AdminMain } from '@/components/admin/bits';
import { ListControls } from '@/components/admin/controls';
import { Pagination } from '@/components/feed-tabs';
import { Avatar, EmptyState, PageHeader } from '@/components/ui';
import { formatDate, isUuid, pageParam, timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'ჟურნალი' };

const TYPES = ['', 'user', 'post', 'comment', 'topic'] as const;

const FIELD_LABELS: Record<string, string> = {
  name: 'სახელი',
  username: 'მომხმარებლის სახელი',
  email: 'ელფოსტა',
  bio: 'ბიოგრაფია',
  location: 'მდებარეობა',
  website: 'ვებგვერდი',
};

type Entry = {
  id: number;
  actor_id: string | null;
  actor_name: string;
  actor_avatar: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_label: string;
  details: Record<string, unknown> | null;
  created_at: string;
  target_exists: boolean;
};

/** Where a log line's target lives now, if it still exists. */
function targetHref(entry: Entry): string | null {
  if (!entry.target_exists || !entry.target_id) return null;
  if (entry.target_type === 'user') return `/admin/users/${entry.target_id}`;
  if (entry.target_type === 'post') return `/admin/posts/${entry.target_id}`;
  if (entry.target_type === 'topic') return `/admin/topics?q=${encodeURIComponent(entry.target_label)}`;
  return null;
}

/** The few details worth a second line, in words. */
function describe(details: Record<string, unknown> | null): string | null {
  if (!details) return null;
  const parts: string[] = [];
  if (typeof details.reason === 'string') parts.push(`მიზეზი: ${details.reason}`);
  if (typeof details.unpublished === 'number' && details.unpublished > 0) parts.push(`მოიხსნა ${details.unpublished} სტატია`);
  if (Array.isArray(details.fields)) {
    parts.push(`ველები: ${details.fields.map((f) => FIELD_LABELS[String(f)] ?? String(f)).join(', ')}`);
  }
  if (typeof details.sessionsEnded === 'number') parts.push(`დასრულდა ${details.sessionsEnded} სესია`);
  if (typeof details.featured === 'boolean') parts.push(details.featured ? 'მოინიშნა რჩეულად' : 'ამოიღო რჩეულებიდან');
  if (details.access === 'admin') parts.push('როლი: ადმინი');
  if (typeof details.reports === 'number') parts.push(`საჩივარი: ${details.reports}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default async function AdminLogPage(props: PageProps<'/admin/log'>) {
  await requireAdmin('/admin/log');
  const params = readParams(await props.searchParams);
  const q = params.q ?? '';
  const type = pick(params.type, TYPES);
  const actorId = isUuid(params.actor) ? params.actor : '';
  const page = pageParam(params.page);

  const where: SQL[] = [sql`true`];
  if (q) {
    const pattern = likePattern(q);
    where.push(sql`(l.target_label ilike ${pattern} or l.actor_name ilike ${pattern})`);
  }
  if (type) where.push(sql`l.target_type = ${type}`);
  if (actorId) where.push(sql`l.actor_id = ${actorId}::uuid`);

  const [entries, actors] = await Promise.all([
    db.execute<Entry>(sql`
      select l.id, l.actor_id, coalesce(a.name, l.actor_name) as actor_name, a.avatar_url as actor_avatar,
        l.action, l.target_type, l.target_id, l.target_label, l.details, l.created_at,
        case l.target_type
          when 'user' then exists (select 1 from users u where u.id::text = l.target_id)
          when 'post' then exists (select 1 from posts p where p.id::text = l.target_id)
          when 'topic' then exists (select 1 from topics t where t.id::text = l.target_id)
          else false
        end as target_exists
      from admin_log l
      left join users a on a.id = l.actor_id
      where ${sql.join(where, sql` and `)}
      order by l.created_at desc, l.id desc
      limit ${PAGE_SIZE + 1} offset ${(page - 1) * PAGE_SIZE}
    `),
    db.execute<{ actor_id: string; name: string }>(sql`
      select distinct on (l.actor_id) l.actor_id, coalesce(u.name, l.actor_name) as name
      from admin_log l left join users u on u.id = l.actor_id
      where l.actor_id is not null
      order by l.actor_id, l.created_at desc
    `),
  ]);

  const hasMore = entries.length > PAGE_SIZE;
  const values = omit(params, 'page', 'q');
  const filtered = Boolean(q || type || actorId);

  return (
    <AdminMain narrow>
      <PageHeader title="ჟურნალი" description="ყველა ცვლილება, რომელიც ადმინისტრირებიდან გაკეთდა." />

      <ListControls
        placeholder="ვის ან რას შეეხო"
        q={q}
        values={values}
        filters={[
          {
            name: 'type',
            label: 'ტიპი',
            options: [
              { value: '', label: 'ყველაფერი' },
              { value: 'user', label: 'ანგარიშები' },
              { value: 'post', label: 'სტატიები' },
              { value: 'comment', label: 'კომენტარები' },
              { value: 'topic', label: 'თემები' },
            ],
          },
          {
            name: 'actor',
            label: 'ადმინი',
            options: [
              { value: '', label: 'ყველა ადმინი' },
              ...actors.map((a) => ({ value: a.actor_id, label: a.name })),
            ],
          },
        ]}
      />

      {entries.length === 0 ? (
        <EmptyState
          title={filtered ? 'ვერაფერი მოიძებნა' : 'ჟურნალი ცარიელია'}
          description={filtered ? 'სცადე სხვა სიტყვა ან მოხსენი ფილტრები.' : 'აქ ჩაიწერება ყველა ცვლილება, რომელსაც ადმინები გააკეთებენ.'}
        />
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-raised">
          {entries.slice(0, PAGE_SIZE).map((entry) => {
            const href = targetHref(entry);
            const note = describe(entry.details);
            return (
              <li key={entry.id} className="flex gap-3 px-4 py-3">
                <Avatar name={entry.actor_name} src={entry.actor_avatar} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1 text-sm leading-relaxed">
                  <p>
                    {entry.actor_id ? (
                      <Link href={`/admin/users/${entry.actor_id}`} className="font-medium text-ink hover:underline">
                        {entry.actor_name}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink">{entry.actor_name}</span>
                    )}{' '}
                    <span className="text-muted">{actionLabel(entry.action)}</span>
                    {entry.target_label ? (
                      <>
                        {' '}
                        {href ? (
                          <Link href={href} className="font-medium text-ink underline-offset-4 hover:underline">
                            {entry.target_label}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink">{entry.target_label}</span>
                        )}
                      </>
                    ) : null}
                  </p>
                  {note ? <p className="truncate text-[13px] text-subtle">{note}</p> : null}
                </div>
                <time
                  dateTime={new Date(entry.created_at).toISOString()}
                  title={formatDate(entry.created_at)}
                  className="shrink-0 pt-0.5 text-[12px] whitespace-nowrap text-subtle"
                >
                  {timeAgo(entry.created_at)}
                </time>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6">
        <Pagination basePath={listHref('/admin/log', params)} page={page} hasMore={hasMore} />
      </div>
    </AdminMain>
  );
}

import type { Metadata } from 'next';
import { sql, type SQL } from 'drizzle-orm';
import { Tags } from 'lucide-react';
import { db } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { likePattern, pick, readParams, omit } from '@/lib/admin';
import { AdminMain } from '@/components/admin/bits';
import { ListControls } from '@/components/admin/controls';
import { TopicsManager, type TopicRow } from '@/components/admin/topics-manager';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'თემები' };

const KINDS = ['', 'featured', 'other', 'empty'] as const;
const SORTS = ['posts', 'name', 'new'] as const;

const ORDER: Record<(typeof SORTS)[number], SQL> = {
  posts: sql`t.post_count desc, lower(t.name)`,
  name: sql`lower(t.name)`,
  new: sql`t.created_at desc`,
};

export default async function AdminTopicsPage(props: PageProps<'/admin/topics'>) {
  await requireAdmin('/admin/topics');
  const params = readParams(await props.searchParams);
  const q = params.q ?? '';
  const kind = pick(params.kind, KINDS);
  const sort = pick(params.sort, SORTS);

  const where: SQL[] = [sql`true`];
  if (q) {
    const pattern = likePattern(q);
    where.push(sql`(t.name ilike ${pattern} or t.slug ilike ${pattern} or t.description ilike ${pattern})`);
  }
  if (kind === 'featured') where.push(sql`t.is_featured`);
  if (kind === 'other') where.push(sql`not t.is_featured`);
  if (kind === 'empty') where.push(sql`not exists (select 1 from post_topics pt where pt.topic_id = t.id)`);

  // Topics are few (tags on a young site); one page holds them all.
  const rows = await db.execute<{
    id: string;
    name: string;
    slug: string;
    description: string;
    is_featured: boolean;
    post_count: number;
    followers: number;
  }>(sql`
    select t.id, t.name, t.slug, t.description, t.is_featured, t.post_count,
      (select count(*)::int from topic_affinity a where a.topic_id = t.id and a.score > 0) as followers
    from topics t
    where ${sql.join(where, sql` and `)}
    order by ${ORDER[sort]}
    limit 500
  `);

  const topicRows: TopicRow[] = rows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    isFeatured: t.is_featured,
    published: t.post_count,
    followers: t.followers,
  }));

  const values = omit(params, 'q');

  return (
    <AdminMain>
      <PageHeader title="თემები" description={kind || q ? `ნაპოვნია ${rows.length}` : `სულ ${rows.length}`} />

      <ListControls
        placeholder="თემის სახელი ან მისამართი"
        q={q}
        values={values}
        filters={[
          {
            name: 'kind',
            label: 'ტიპი',
            options: [
              { value: '', label: 'ყველა თემა' },
              { value: 'featured', label: 'რჩეული' },
              { value: 'other', label: 'არარჩეული' },
              { value: 'empty', label: 'სტატიების გარეშე' },
            ],
          },
          {
            name: 'sort',
            label: 'დალაგება',
            options: [
              { value: '', label: 'ყველაზე მეტი სტატია' },
              { value: 'name', label: 'სახელით' },
              { value: 'new', label: 'ახლები ჯერ' },
            ],
          },
        ]}
      />

      {topicRows.length === 0 && (q || kind) ? (
        <EmptyState icon={<Tags />} title="ვერაფერი მოიძებნა" description="სცადე სხვა სიტყვა ან მოხსენი ფილტრები." />
      ) : (
        <TopicsManager rows={topicRows} />
      )}
    </AdminMain>
  );
}

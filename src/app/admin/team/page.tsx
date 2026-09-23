import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { Check, Minus } from 'lucide-react';
import { db } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { AccessBadge, AdminMain } from '@/components/admin/bits';
import { AdminSection } from '@/components/admin/user-forms';
import { AddAdminForm, RemoveAdminButton, TransferForm } from '@/components/admin/team-forms';
import { FlashToast } from '@/components/article-chrome';
import { Avatar, Badge, PageHeader } from '@/components/ui';
import type { Access } from '@/db/schema';
import { timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'გუნდი' };

const CAPABILITIES: [string, boolean, boolean][] = [
  ['წევრების ნახვა, რედაქტირება, შეჩერება და წაშლა', true, true],
  ['სტატიების რედაქტირება, მოხსნა და წაშლა', true, true],
  ['კომენტარებისა და თემების მართვა', true, true],
  ['ჟურნალის ნახვა', true, true],
  ['ადმინების დანიშვნა და მოხსნა', false, true],
  ['ადმინების ანგარიშების შეცვლა', false, true],
  ['სუპერადმინობის გადაცემა', false, true],
];

export default async function AdminTeamPage(props: PageProps<'/admin/team'>) {
  const actor = await requireAdmin('/admin/team');
  const searchParams = await props.searchParams;
  const isSuper = actor.access === 'super_admin';

  const team = await db.execute<{
    id: string;
    name: string;
    username: string;
    email: string;
    avatar_url: string | null;
    access: Access;
    suspended_at: string | null;
    actions: number;
    last_action: string | null;
  }>(sql`
    select u.id, u.name, u.username, u.email, u.avatar_url, u.access, u.suspended_at,
      (select count(*)::int from admin_log l where l.actor_id = u.id) as actions,
      (select max(l.created_at) from admin_log l where l.actor_id = u.id) as last_action
    from users u
    where u.access <> 'user'
    order by (u.access = 'super_admin') desc, lower(u.name)
  `);

  const admins = team.filter((m) => m.access === 'admin');

  return (
    <AdminMain narrow>
      {searchParams.transferred === '1' ? <FlashToast message="სუპერადმინობა გადაცემულია" /> : null}
      <PageHeader title="გუნდი" description={`${team.length} ადამიანი მართავს საიტს.`} />

      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-line bg-raised">
          <ul className="divide-y divide-line">
            {team.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                <Avatar name={member.name} src={member.avatar_url} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/users/${member.id}`} className="truncate font-medium text-ink hover:underline">
                      {member.name}
                    </Link>
                    <AccessBadge access={member.access} />
                    {member.id === actor.id ? <Badge>შენ</Badge> : null}
                    {member.suspended_at ? <Badge tone="danger">შეჩერებული</Badge> : null}
                  </div>
                  <p className="truncate text-[13px] text-subtle">
                    {member.email} ·{' '}
                    {member.actions > 0
                      ? `${member.actions} ქმედება, ბოლოს ${timeAgo(member.last_action)}`
                      : 'ჯერ არაფერი შეუცვლია'}
                  </p>
                </div>
                {isSuper && member.access === 'admin' ? <RemoveAdminButton id={member.id} name={member.name} /> : null}
              </li>
            ))}
          </ul>
        </div>

        {isSuper ? (
          <>
            <AdminSection
              title="ადმინის დანიშვნა"
              description="ანგარიში უკვე უნდა არსებობდეს. ახალი ადმინი ადმინისტრირებას შემდეგი გვერდის ჩატვირთვისთანავე დაინახავს."
            >
              <AddAdminForm />
            </AdminSection>

            <AdminSection
              title="სუპერადმინობის გადაცემა"
              tone="danger"
              description="სუპერადმინი მხოლოდ ერთია. გადაცემის შემდეგ შენ ჩვეულებრივი ადმინი გახდები და უკან დაბრუნება მხოლოდ ახალ სუპერადმინს შეეძლება."
            >
              <TransferForm admins={admins.map((a) => ({ id: a.id, name: a.name, username: a.username }))} />
            </AdminSection>
          </>
        ) : (
          <p className="rounded-xl border border-line bg-sunken px-4 py-3 text-sm text-muted">
            გუნდს მხოლოდ სუპერადმინი ცვლის.
          </p>
        )}

        <AdminSection title="ვის რა შეუძლია">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 pr-4 text-[12px] font-medium text-muted">
                    <span className="sr-only">უფლება</span>
                  </th>
                  <th className="px-3 py-2 text-center text-[12px] font-medium text-muted">ადმინი</th>
                  <th className="py-2 pl-3 text-center text-[12px] font-medium text-muted">სუპერადმინი</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {CAPABILITIES.map(([label, admin, superAdmin]) => (
                  <tr key={label}>
                    <td className="py-2.5 pr-4 text-ink">{label}</td>
                    {[admin, superAdmin].map((allowed, i) => (
                      <td key={i} className="px-3 py-2.5 text-center">
                        {allowed ? (
                          <Check className="mx-auto size-4 text-accent" aria-label="კი" />
                        ) : (
                          <Minus className="mx-auto size-4 text-subtle" aria-label="არა" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            სუპერადმინის ანგარიშს ადმინისტრირებიდან ვერავინ შეცვლის — არც თავად. საკუთარი ანგარიში ყველას
            პარამეტრებში აქვს.
          </p>
        </AdminSection>
      </div>
    </AdminMain>
  );
}

import type { Metadata } from 'next';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { requireAdmin } from '@/lib/auth';
import { AdminMobileBar, AdminSidebar } from '@/components/admin/admin-nav';

export const metadata: Metadata = {
  title: { default: 'ადმინისტრირება', template: '%s · ადმინი · Dawere' },
  robots: { index: false, follow: false },
};

/**
 * Admins only; everyone else gets a 404. The pages and every action check
 * again on their own — this check keeps the shell from rendering, nothing more.
 */
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await requireAdmin();
  const navUser = { name: user.name, username: user.username, avatarUrl: user.avatarUrl, isAdmin: true };
  // One per reported thing, as the queue lists them, not per report.
  const [{ open }] = await db.execute<{ open: number }>(sql`
    select count(distinct (target_type, target_id))::int as open from reports where status = 'open'
  `);
  const badges = { '/admin/reports': open };

  return (
    <div className="flex flex-1">
      <AdminSidebar user={navUser} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileBar user={navUser} badges={badges} />
        {children}
      </div>
    </div>
  );
}

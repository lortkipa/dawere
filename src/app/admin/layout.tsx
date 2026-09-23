import type { Metadata } from 'next';
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

  return (
    <div className="flex flex-1">
      <AdminSidebar user={navUser} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileBar user={navUser} />
        {children}
      </div>
    </div>
  );
}

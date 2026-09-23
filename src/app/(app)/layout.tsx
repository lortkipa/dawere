import { getCurrentUser, isStaff } from '@/lib/auth';
import { unreadCount } from '@/lib/notifications';
import { AppSidebar, MobileNav } from '@/components/nav-links';
import { NotificationPoller } from '@/components/notification-bell';
import { SearchDialog } from '@/components/search-dialog';
import { SiteFooter } from '@/components/site-footer';
import { MobileTopBar, SiteHeader } from '@/components/site-header';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <SiteHeader />
        {children}
        <SiteFooter />
        <SearchDialog />
      </>
    );
  }

  const unread = await unreadCount(user.id);
  const navUser = {
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl,
    isAdmin: isStaff(user),
    unread,
  };

  return (
    <div className="flex flex-1">
      <AppSidebar user={navUser} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar user={navUser} />
        {children}
        <SiteFooter compact />
        {/* Room for the fixed tab bar, so it never covers the footer. */}
        <div className="h-16 md:hidden" aria-hidden />
      </div>
      <MobileNav user={navUser} />
      <SearchDialog />
      <NotificationPoller initial={unread} since={new Date().toISOString()} />
    </div>
  );
}

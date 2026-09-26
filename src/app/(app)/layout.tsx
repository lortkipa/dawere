import { getCurrentUser, isStaff } from '@/lib/auth';
import { unreadCount } from '@/lib/notifications';
import { NotificationPoller } from '@/components/notification-bell';
import { SearchDialog } from '@/components/search-dialog';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

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
    <>
      <SiteHeader user={navUser} />
      {children}
      <SiteFooter compact />
      <SearchDialog />
      <NotificationPoller initial={unread} since={new Date().toISOString()} />
    </>
  );
}
